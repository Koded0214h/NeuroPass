from django.urls import path
from . import views

urlpatterns = [
    path('skills/', views.SkillListView.as_view(), name='skill-list'),
    path('skills/queue/', views.VerifierQueueView.as_view(), name='verifier-queue'),
    path('skill/submit/', views.SkillSubmitView.as_view(), name='skill-submit'),
    path('skill/<int:pk>/audio/', views.AudioDescriptionView.as_view(), name='skill-audio'),
    path('passport/', views.PassportView.as_view(), name='passport'),
    path('skill/<int:pk>/verify/', views.VerificationView.as_view(), name='skill-verify'),
    path('credential/<str:credential_id>/', views.PublicVerifyView.as_view(), name='public-verify'),
    path('sync-check/<int:skill_id>/', views.SyncCheckView.as_view(), name='sync-check'),
    path('passport/<str:username>/', views.PublicPassportView.as_view(), name='public-passport'),
]