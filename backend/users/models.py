from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    wallet_address = models.CharField(max_length=44, unique=True, blank=True, null=True)
    is_verifier = models.BooleanField(default=False)
    reputation_score = models.FloatField(default=0.0)
    nonce = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        wallet = self.wallet_address[:8] if self.wallet_address else "None"
        return f"{self.user.username} wallet={wallet}..."