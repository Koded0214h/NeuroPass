from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Skill, Verification, Credential
from .serializers import SkillSerializer, SkillCreateSerializer, VerificationSerializer
from .services import upload_to_ipfs, sha256_hash
from .web3 import mint_credential_nft
from .anchor import anchor_credential_on_chain
from .ai import generate_skill_analysis, text_to_speech_yarngpt

ALLOWED_CONTENT_TYPES = {
    'video/mp4', 'video/webm', 'video/quicktime',
    'image/jpeg', 'image/png', 'image/gif',
    'application/pdf', 'text/plain', 'application/zip',
}
MAX_FILE_BYTES = 50 * 1024 * 1024  # 50 MB


class SkillSubmitView(generics.CreateAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    parser_classes = (MultiPartParser, FormParser)
    serializer_class = SkillCreateSerializer

    def perform_create(self, serializer):
        from .services import validate_file_integrity, generate_solid_sha256
        
        file_obj = self.request.FILES.get('file')
        
        if not file_obj:
            raise ValidationError({'file': 'A file upload is required.'})
        if file_obj.size > MAX_FILE_BYTES:
            raise ValidationError({'file': 'File exceeds the 50 MB size limit.'})

        validate_file_integrity(file_obj, ALLOWED_CONTENT_TYPES)

        proof = generate_solid_sha256(file_obj)
        
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
    """
    Consolidated view for Frontier Pass integration.
    Returns the full "Verifiable Identity" of a user.
    """
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

        Verification.objects.create(skill=skill, verifier=request.user, decision=decision, comment=comment)

        if decision == 'approve':
            skill.status = 'verified'
            skill.save()

            # Update verifier reputation
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

                # Anchor the credential permanently on the NeuroPass program
                try:
                    anchor_credential_on_chain(
                        skill_name=skill.name,
                        proof_hash_hex=skill.file_sha256,
                        ipfs_cid=skill.file_ipfs_hash,
                        mint_pubkey=SoldersPubkey.from_string(mint_addr),
                        metadata_uri=metadata_uri,
                    )
                except Exception as anchor_err:
                    # Non-fatal: NFT already minted; log and continue
                    import logging
                    logging.getLogger(__name__).warning(
                        "Anchor record_credential failed (non-fatal): %s", anchor_err
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
