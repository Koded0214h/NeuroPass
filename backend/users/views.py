import secrets
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from solders.pubkey import Pubkey
from solders.signature import Signature
from .serializers import RegisterSerializer, UserMeSerializer
from .models import Profile

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

class MeView(generics.RetrieveAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserMeSerializer

    def get_object(self):
        return self.request.user

class LinkWalletView(generics.UpdateAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def patch(self, request):
        wallet = request.data.get('wallet_address')
        signature_b58 = request.data.get('signature')
        
        if not wallet or not signature_b58:
            return Response({'error': 'wallet_address and signature required'}, status=status.HTTP_400_BAD_REQUEST)
        
        profile = request.user.profile
        if not profile.nonce:
            return Response({'error': 'Nonce not found. Please request a nonce first.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pubkey = Pubkey.from_string(wallet)
            signature = Signature.from_string(signature_b58)
            message = profile.nonce.encode()
            
            if not signature.verify(pubkey, message):
                return Response({'error': 'Invalid signature.'}, status=status.HTTP_401_UNAUTHORIZED)
            
            # Check if wallet is already taken
            if Profile.objects.filter(wallet_address=wallet).exclude(user=request.user).exists():
                return Response({'error': 'Wallet already linked to another account.'}, status=status.HTTP_400_BAD_REQUEST)

            profile.wallet_address = wallet
            profile.nonce = None
            profile.save()
            return Response({'status': 'wallet linked'})
        except Exception as e:
            return Response({'error': f'Verification failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

class GenerateNonceView(APIView):
    permission_classes = []

    def post(self, request):
        wallet_address = request.data.get('wallet_address')
        
        if request.user.is_authenticated:
            profile = request.user.profile
        else:
            if not wallet_address:
                return Response({'error': 'Wallet address is required for login.'}, status=status.HTTP_400_BAD_REQUEST)
            profile = Profile.objects.filter(wallet_address=wallet_address).first()
            if not profile:
                # Create a temporary user or just return error? 
                # PRD says we can register via wallet.
                username = f"user_{wallet_address[:8]}"
                user, created = User.objects.get_or_create(username=username)
                profile, p_created = Profile.objects.get_or_create(user=user)
                if p_created or not profile.wallet_address:
                    profile.wallet_address = wallet_address
                    profile.save()
        
        secure_string = secrets.token_hex(16)
        challenge_message = f"Sign this message to prove you own this wallet and log into NeuroPass.\n\nNonce: {secure_string}"
        profile.nonce = challenge_message
        profile.save()
        return Response({'nonce': challenge_message})

class VerifyWalletView(APIView):
    permission_classes = []

    def post(self, request):
        wallet_address = request.data.get('wallet_address')
        signature_b58 = request.data.get('signature')
        if not wallet_address or not signature_b58:
            return Response({'error': 'Wallet and signature required.'}, status=status.HTTP_400_BAD_REQUEST)
        profile = Profile.objects.filter(wallet_address=wallet_address).first()
        if not profile or not profile.nonce:
            return Response({'error': 'Nonce not found.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            pubkey = Pubkey.from_string(wallet_address)
            signature = Signature.from_string(signature_b58)
            message = profile.nonce.encode()
            if not signature.verify(pubkey, message):
                return Response({'error': 'Invalid signature.'}, status=status.HTTP_401_UNAUTHORIZED)
            profile.nonce = None
            profile.save()
            refresh = RefreshToken.for_user(profile.user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            })
        except Exception:
            return Response({'error': 'Verification failed.'}, status=status.HTTP_400_BAD_REQUEST)