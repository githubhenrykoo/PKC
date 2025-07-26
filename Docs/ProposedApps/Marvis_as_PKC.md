Can you answer these fro me and they are more related to the platform: 🧩 Clarifying Questions

Knowing that MARVIS is running on the MVP Cards infrastructure, please answer the following questions

1.⁠ ⁠Protocol Stack: Messaging + Call
	•	Will MARVIS implement its own E2EE messaging protocol, or adopt a standard like the Signal Protocol or MLS (Message Layer Security)?
	•	For VOIP: are we building custom signaling and media encryption, or leveraging WebRTC with DTLS-SRTP and custom key handling?

2.⁠ ⁠PKC Query Interface + Access
	•	How does the MARVIS Call module query or write to the PKC?
	•	Is there a defined API for memory insert/update?
	•	Can I subscribe to memory changes (e.g., translation correction, identity rotation)?
	•	What’s the data model/schema for storing:
	•	Translation events?
	•	File metadata?
	•	Contact tagging and trust status?

3.⁠ ⁠Identity: Alias Lifecycle
	•	What is the alias registration flow on first use?
	•	Are aliases globally unique? Resolvable via local registry or p2p graph?
	•	How do we handle alias recovery if a user loses their device but has no cloud backup enabled?
	•	Can a single user manage multiple aliases, or alias groups?

4.⁠ ⁠Cross-Device Behavior (Multi-Device Sync)
	•	If I log in from a second device (e.g., desktop), how is session sync authorized?
	•	Manual QR code scan only?
	•	Will PKC store per-device keys?
	•	Are messages synced across devices, or is MARVIS Call single-device per alias unless sync is configured?

5.⁠ ⁠Translation Engine
	•	Where does translation inference run — on-device (e.g., Whisper-style transformer) or edge-deployed?
	•	How is the correction mechanism fed back into the translation model?
	•	Is there federated learning or alias-level fine-tuning?
	•	Are the translation models fixed or modular per language pair?

6.⁠ ⁠Event Detection
	•	Is NLP event detection done fully on-device?
	•	What model or pipeline is used for extracting time/place/actor?
	•	If integrated with MARVIS Assist’s calendar, how are conflicts or overlaps resolved?

7.⁠ ⁠Encrypted File Handling
	•	What encryption protocol is used for media (e.g., AES-GCM, NaCl box)?
	•	Are files chunked for large transfers (e.g., 100MB+)?
	•	Will previews (e.g., thumbnails, waveform) be pre-rendered on sender device or generated on receiver side?

8.⁠ ⁠Storage Sync Behavior
	•	What is the expected behavior when sync is toggled off and back on?
	•	Are there conflict resolution rules for message or file updates?
	•	If a file is shared in a thread and later deleted by sender, is that deletion enforced across synced devices?