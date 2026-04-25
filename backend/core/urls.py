from django.urls import path
from . import views

urlpatterns = [
    path('skills/', views.SkillListView.as_view(), name='skill-list'),
    path('skill/submit/', views.SkillSubmitView.as_view(), name='skill-submit'),
    path('skill/<int:pk>/verify/', views.VerificationView.as_view(), name='skill-verify'),
    path('credential/<str:credential_id>/', views.PublicVerifyView.as_view(), name='public-verify'),
]