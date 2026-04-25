from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ('wallet_address', 'is_verifier', 'reputation_score')


class UserMeSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'profile')


class RegisterSerializer(serializers.ModelSerializer):
    wallet_address = serializers.CharField(write_only=True, required=False, default='')

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'wallet_address')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        wallet = validated_data.pop('wallet_address', '')
        user = User.objects.create_user(**validated_data)
        if wallet:
            user.profile.wallet_address = wallet
            user.profile.save()
        return user
