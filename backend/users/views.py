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
        if not wallet:
            return Response({'error': 'wallet_address required'}, status=status.HTTP_400_BAD_REQUEST)
        profile = request.user.profile
        profile.wallet_address = wallet
        profile.save()
        return Response({'status': 'wallet linked'})

class GenerateNonceView(APIView):
    permission_classes = []

    def post(self, request):
        wallet_address = request.data.get('wallet_address')
        if not wallet_address:
            return Response({'error': 'Wallet address is required.'}, status=status.HTTP_400_BAD_REQUEST)
        profile = Profile.objects.filter(wallet_address=wallet_address).first()
        if not profile:
            new_user = User.objects.create(username=wallet_address)
            profile, created = Profile.objects.get_or_create(user=new_user, defaults={'wallet_address': wallet_address})
            if not created and not profile.wallet_address:
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