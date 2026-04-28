from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', views.MeView.as_view(), name='me'),
    path('wallet/', views.LinkWalletView.as_view(), name='link_wallet'),
    path('nonce/', views.GenerateNonceView.as_view(), name='generate_nonce'),
    path('verify/', views.VerifyWalletView.as_view(), name='verify_wallet'),
]