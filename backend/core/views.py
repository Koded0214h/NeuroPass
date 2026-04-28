from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
from .models import Skill, Verification, Credential, AuditLog
from .serializers import SkillSerializer, SkillCreateSerializer, VerificationSerializer
from .services import upload_to_ipfs, generate_solid_sha256, verify_onchain_sync
from .web3 import mint_credential_nft
from .anchor import anchor_credential_on_chain
from .ai import generate_skill_analysis, text_to_speech_yarngpt

ALLOWED_CONTENT_TYPES = {
    'video/mp4', 'video/webm', 'video/quicktime',
    'image/jpeg', 'image/png', 'image/gif',
    'application/pdf', 'text/plain', 'application/zip',
}
MAX_FILE_BYTES = 50 * 1024 * 1024

class SkillSubmitView(generics.CreateAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    parser_classes = (MultiPartParser, FormParser)
    serializer_class = SkillCreateSerializer
    throttle_classes = [UserRateThrottle, AnonRateThrottle]

    def perform_create(self, serializer):
        from .services import validate_file_integrity, generate_solid_sha256, check_hash_with_virustotal
        
        file_obj = self.request.FILES.get('file')
        
        if not file_obj:
            raise ValidationError({'file': 'A file upload is required.'})
        if file_obj.size > MAX_FILE_BYTES:
            raise ValidationError({'file': 'File exceeds the 50 MB size limit.'})

        validate_file_integrity(file_obj, ALLOWED_CONTENT_TYPES)
        proof = generate_solid_sha256(file_obj)
        check_hash_with_virustotal(proof)
        
        content = file_obj.read()
        ipfs_hash = upload_to_ipfs(content, file_obj.name)
        
        name = self.request.data.get('name')
        desc = self.request.data.get('description')
        ai_data = generate_skill_analysis(name, desc)
        
        serializer.save(
            user=self.request.user,
            description=ai_data.get('refined_description', desc),
            file_ipfs_hash=ipfs_hash,
            file_sha256=proof,
            status='submitted',
            tags=ai_data.get('tags', []),
            skill_level=ai_data.get('level', 'Intermediate'),
        )

class AudioDescriptionView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    throttle_classes = [UserRateThrottle]

    def get(self, request, pk):
        try:
            skill = Skill.objects.get(pk=pk, user=request.user)
        except Skill.DoesNotExist:
            return Response({'error': 'Skill not found'}, status=status.HTTP_404_NOT_FOUND)
        
        audio_content = text_to_speech_yarngpt(skill.description)
        if not audio_content:
            return Response({'error': 'TTS generation failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(
            audio_content, 
            content_type='audio/mpeg',
            headers={'Content-Disposition': f'attachment; filename="skill_{pk}.mp3"'}
        )

class PassportView(generics.RetrieveAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        profile = user.profile
        skills = Skill.objects.filter(user=user, status='verified').select_related('credential')
        serializer = SkillSerializer(skills, many=True)
        
        return Response({
            'user': {
                'username': user.username,
                'email': user.email,
                'wallet_address': profile.wallet_address,
            },
            'trust_metrics': {
                'reputation_score': profile.reputation_score,
                'is_verifier': profile.is_verifier,
            },
            'verified_skills': serializer.data,
            'export_format': 'NeuroPass-v1',
        })

class SkillListView(generics.ListAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = SkillSerializer

    def get_queryset(self):
        return (
            Skill.objects
            .filter(user=self.request.user)
            .select_related('credential', 'verification')
            .order_by('-submitted_at')
        )

class VerificationView(generics.UpdateAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    queryset = Skill.objects.all()
    serializer_class = VerificationSerializer

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if not request.user.profile.is_verifier:
            self.permission_denied(request, message='Only verifiers can approve skills.')
        if obj.user == request.user:
            self.permission_denied(request, message='You cannot verify your own submission.')

    def patch(self, request, *args, **kwargs):
        skill = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        decision = serializer.validated_data['decision']
        comment = serializer.validated_data.get('comment', '')

        client_ip = request.META.get('REMOTE_ADDR')
        AuditLog.objects.create(
            action=f"VERIFY_{decision.upper()}",
            user=request.user,
            ip_address=client_ip,
            details={"skill_id": skill.id, "comment": comment}
        )

        Verification.objects.create(skill=skill, verifier=request.user, decision=decision, comment=comment)

        if decision == 'approve':
            skill.status = 'verified'
            skill.save()

            verifier_profile = request.user.profile
            verifier_profile.reputation_score += 1.0
            verifier_profile.save()

            try:
                from solders.pubkey import Pubkey as SoldersPubkey
                mint_addr, tx_sig, metadata_uri = mint_credential_nft(skill)
                Credential.objects.create(
                    skill=skill,
                    mint_address=mint_addr,
                    transaction_signature=tx_sig,
                    metadata_uri=metadata_uri,
                )

                try:
                    anchor_credential_on_chain(
                        skill_name=skill.name,
                        proof_hash_hex=skill.file_sha256,
                        ipfs_cid=skill.file_ipfs_hash,
                        mint_pubkey=SoldersPubkey.from_string(mint_addr),
                        metadata_uri=metadata_uri,
                    )
                except Exception as anchor_err:
                    import logging
                    logging.getLogger(__name__).warning(
                        "Anchor record_credential failed: %s", anchor_err
                    )

            except Exception as e:
                return Response(
                    {'error': f'NFT minting failed: {e}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        else:
            skill.status = 'rejected'
            skill.save()

        return Response({'status': decision})


class VerifierQueueView(generics.ListAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = SkillSerializer

    def get_queryset(self):
        if not self.request.user.profile.is_verifier:
            return Skill.objects.none()
        return (
            Skill.objects
            .filter(status='submitted')
            .exclude(user=self.request.user)
            .select_related('user', 'credential')
            .order_by('-submitted_at')
        )


class PublicVerifyView(generics.RetrieveAPIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request, credential_id):
        try:
            credential = Credential.objects.select_related(
                'skill__verification__verifier'
            ).get(mint_address=credential_id)
        except Credential.DoesNotExist:
            return Response({'valid': False}, status=status.HTTP_404_NOT_FOUND)

        skill = credential.skill
        return Response({
            'valid': True,
            'skill_name': skill.name,
            'proof_hash': skill.file_sha256,
            'verifier': skill.verification.verifier.username,
            'mint_address': credential.mint_address,
            'metadata_uri': credential.metadata_uri,
        })


class PublicPassportView(generics.RetrieveAPIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request, username):
        from django.contrib.auth.models import User
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        credentials = Credential.objects.select_related(
            'skill', 'skill__verification__verifier'
        ).filter(skill__user=user, skill__status='verified')

        return Response({
            'username': user.username,
            'wallet_address': user.profile.wallet_address,
            'credentials': [
                {
                    'skill_name': c.skill.name,
                    'skill_level': c.skill.skill_level,
                    'tags': c.skill.tags,
                    'proof_hash': c.skill.file_sha256,
                    'verifier': c.skill.verification.verifier.username,
                    'mint_address': c.mint_address,
                    'transaction_signature': c.transaction_signature,
                    'minted_at': c.minted_at,
                }
                for c in credentials
            ],
        })

class SyncCheckView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]

    def get(self, request, skill_id):
        try:
            skill = Skill.objects.get(id=skill_id)
            credential = getattr(skill, 'credential', None)
            
            if not credential:
                return Response({
                    "is_synchronized": False,
                    "reason": "Not minted on-chain"
                })
            
            is_valid = verify_onchain_sync(
                credential.transaction_signature, 
                skill.file_sha256
            )
            
            return Response({
                "is_synchronized": is_valid,
                "db_hash": skill.file_sha256,
                "mint_address": credential.mint_address,
                "transaction_signature": credential.transaction_signature
            })
            
        except Skill.DoesNotExist:
            return Response({"error": "Skill not found"}, status=status.HTTP_404_NOT_FOUND)