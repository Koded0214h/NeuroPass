from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.contrib.auth.models import User
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
