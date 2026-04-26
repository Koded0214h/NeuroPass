from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    wallet_address =models.CharField(max_length=44, unique=True, blank=True, null=True)  # Solana pubkey
    is_verifier = models.BooleanField(default=False)
    reputation_score = models.FloatField(default=0.0)

    def __str__(self):
        return f"{self.user.username} wallet={self.wallet_address[:8]}..."