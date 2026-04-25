NEUROPASS -  PRODUCT REQUIREMENTS DOCUMENT (PRD)
OnchainED 1.0 Hackathon
1. PRODUCT OVERVIEW
Product Name: NeuroPass
Tagline: From Invisible Talent to Verifiable Opportunity
Objective
NeuroPass is designed to create a real, working system that:
Captures offline skills
Verifies them through trusted actors
Anchors proof on the Solana blockchain (Devnet)
Issues verifiable credentials (NFT-based)
Enables public verification
Connects users to opportunities (with Frontier Pass integration readiness)
2. PROBLEM STATEMENT
Across Africa, a significant portion of the workforce operates in the informal sector. These individuals possess real, valuable skills but lack formal documentation or trusted credentials to prove their abilities.
Key Issues
Skills are not verifiable
Informal talent is not recognized
Certificates often do not reflect real ability
Employers cannot trust existing credentials
Neurodivergent and non-traditional learners are excluded
There is no system connecting learning, skills, and opportunity
Core Insight
Africa does not have a talent problem. It has a recognition, trust, and access problem.


3. SOLUTION OVERVIEW
NeuroPass provides a system that:
Captures real-world skills through digital submission
Verifies those skills through trusted validators
Secures the data using cryptographic hashing
Converts verified skills into onchain credentials using Solana
Allows anyone to verify credentials publicly
Enables users to share verified profiles for opportunities
4. TARGET USERS
Primary Users
Students
Informal workers (artisans, freelancers)
Self-taught individuals
Neurodivergent learners
Secondary Users
Verifiers (mentors, teachers, experts)
Employers and recruiters
NGOs and training programs
Opportunity platforms (e.g., Frontier Pass)

5. SYSTEM OVERVIEW (END-TO-END FLOW)
The system must support the following complete flow:
User signs up and connects their wallet
User uploads proof of skill (video or project)
System generates a cryptographic hash of the uploaded file
A verified validator reviews and approves the skill
System mints a credential NFT on Solana Devnet
Credential metadata includes proof hash and verifier information
User views credential in their dashboard
Public users can verify credentials through a verification interface
User profile can be exported for opportunity platforms

6. CORE FEATURES AND MODULES
A. Authentication and Identity System
Description
The system will support hybrid identity combining traditional login and blockchain wallet identity.
Requirements
Email and password authentication
JWT-based session management
Phantom wallet connection
Storage of wallet address linked to user account
Cybersecurity Considerations
Password hashing using secure algorithms
Token expiration and session validation
Rate limiting to prevent brute-force attacks
B. Skill Submission and Storage
Description
Users must be able to submit proof of skills in a structured format.
Frontend Requirements
Form for skill name, description, and file upload
Backend Requirements
File storage using IPFS (preferred) or cloud storage
Generation of SHA-256 hash for each uploaded file
Creation of skill record with status tracking
Cybersecurity Considerations
File type validation
File size limits
Basic malware scanning

C. AI System (YarnGPT Integration)
Description
AI is used to enhance usability, accessibility, and data quality.
Features
Skill tagging based on user input
Skill level suggestion
Assistance in writing descriptions
Multilingual support (English and at least one local language)
Integration
Backend connects to GPT API
AI processes input and returns structured suggestions
D. Verification System
Description
Skills must be verified before being converted into credentials.
Requirements
Only users with verifier roles can approve submissions
Verifiers can review, approve, or reject submissions
System stores verifier identity and decision
Cybersecurity Considerations
Role-based access control
Prevention of self-verification
Audit trail of approvals
E. Blockchain Credential System (Solana Integration)
Description
Verified skills are converted into NFTs on Solana.
Requirements
Use Solana Devnet
Use Web3.js for interaction
Mint NFT after verification
Process
Prepare credential metadata including skill, verifier, proof hash, and timestamp
Upload metadata to decentralized storage
Mint NFT and assign it to the user’s wallet
Store transaction signature and mint address
Cybersecurity Considerations
Transactions must be signed securely via wallet
Private keys must never be exposed
F Proof Hashing System
Description
Ensures integrity of submitted skill evidence.
Implementation
Generate SHA-256 hash of uploaded file
Store hash in database and on blockchain
Use hash comparison for verification
Outcome
Guarantees that submitted proof cannot be altered without detection
G. Public Verification System
Description
Allows external users to verify credentials.
Frontend
Input field for wallet address or credential ID
Backend
Retrieve credential data
Fetch blockchain metadata
Compare stored and onchain hashes
Output
Verification status
Skill details
Verifier identity
H. User Dashboard
Description
Displays all user-related data.
Features
List of submitted skills
Verification status
Minted credentials
Verifier information
I Frontier Pass Integration (Conceptual + Technical Readiness)
Description
The system must be ready to integrate with opportunity platforms.
Features
Exportable user profile API
Structured output including skills, credentials, and trust indicators
Interface to simulate sending profile to external platform
Positioning
NeuroPass acts as a verified identity layer that platforms like Frontier Pass can integrate with
J. Verifier Reputation System
Description
Assigns trust scores to validators.
Logic
Based on number of approvals and consistency
Higher accuracy increases reputation score
Usage
Display on credentials
Influences trust level of verification
7. TECHNOLOGY STACK
Frontend
React / Next.js
Tailwind CSS
Backend
Node.js / Express
PostgreSQL or Supabase
Storage
IPFS (preferred) or Firebase
Blockchain
Solana Devnet
Web3.js
Metaplex (optional for NFT standard)
AI
GPT API (YarnGPT layer)
Optional speech integration
Cybersecurity
JWT authentication
HTTPS encryption
Input validation
Role-based access control
File validation
Rate limiting


8. SUCCESS CRITERIA
The system is considered successful if it:
Mints real NFTs on Solana
Stores and verifies proof hashes correctly
Demonstrates wallet-based ownership
Provides a working public verification system
Shows a complete, functional user flow
9. FINAL POSITIONING
NeuroPass is a verifiable skill identity system built on Solana that bridges offline talent to global opportunities through trust, security, and ownership.

