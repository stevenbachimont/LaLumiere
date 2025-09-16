<script lang="ts">
	import { onMount } from 'svelte';
	import MobileButton from './MobileButton.svelte';
	import MobileCard from './MobileCard.svelte';
	import CadrerChallenge from './CadrerChallenge.svelte';

	// Types de défis
	interface Challenge {
		id: string;
		title: string;
		description: string;
		icon: string;
		difficulty: 'facile' | 'moyen' | 'difficile';
		timeLimit: number; // en minutes
		completed: boolean;
		completedAt?: Date;
	}

	// États
	let challenges: Challenge[] = [];
	let activeChallenge: Challenge | null = null;
	let challengeTimer: number = 0;
	let isChallengeActive = false;
	let timerInterval: number | null = null;
	let showCadrerChallenge = false;

	onMount(() => {
		initializeChallenges();
		loadProgress();
	});

	function initializeChallenges() {
		challenges = [
			{
				id: 'cadrer',
				title: 'CADRER',
				description: 'Recréez exactement le cadrage de l\'image de référence',
				icon: '🎯',
				difficulty: 'moyen',
				timeLimit: 15,
				completed: false
			}
		];
	}

	function loadProgress() {
		// Vérifier que nous sommes côté client
		if (typeof window === 'undefined') return;
		
		try {
			const saved = localStorage.getItem('challenges-progress');
			if (saved) {
				const savedChallenges = JSON.parse(saved);
				challenges = challenges.map(challenge => {
					const saved = savedChallenges.find((c: Challenge) => c.id === challenge.id);
					return saved ? { ...challenge, ...saved } : challenge;
				});
			}
		} catch (error) {
			console.error('Erreur lors du chargement des progrès:', error);
		}
	}

	function saveProgress() {
		// Vérifier que nous sommes côté client
		if (typeof window === 'undefined') return;
		
		try {
			localStorage.setItem('challenges-progress', JSON.stringify(challenges));
		} catch (error) {
			console.error('Erreur lors de la sauvegarde des progrès:', error);
		}
	}

	function startChallenge(challenge: Challenge) {
		if (challenge.id === 'cadrer') {
			showCadrerChallenge = true;
			activeChallenge = challenge;
			challengeTimer = challenge.timeLimit * 60; // Convertir en secondes
			isChallengeActive = true;
			
			// Démarrer le timer
			timerInterval = setInterval(() => {
				challengeTimer--;
				if (challengeTimer <= 0) {
					completeChallenge(false);
				}
			}, 1000);
		}
	}

	function completeChallenge(success: boolean) {
		if (!activeChallenge) return;

		if (success) {
			const challenge = challenges.find(c => c.id === activeChallenge!.id);
			if (challenge) {
				challenge.completed = true;
				challenge.completedAt = new Date();
				// Mettre à jour le tableau pour déclencher la réactivité
				challenges = [...challenges];
				saveProgress();
			}
		}

		// Arrêter le timer
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}

		activeChallenge = null;
		isChallengeActive = false;
		challengeTimer = 0;
		showCadrerChallenge = false;
	}

	function goBackFromChallenge() {
		showCadrerChallenge = false;
		completeChallenge(false);
	}

	function formatTime(seconds: number): string {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
	}

	function getDifficultyColor(difficulty: string): string {
		switch (difficulty) {
			case 'facile': return '#10b981';
			case 'moyen': return '#f59e0b';
			case 'difficile': return '#ef4444';
			default: return '#6b7280';
		}
	}

	function getCompletedCount(): number {
		return challenges.filter(c => c.completed).length;
	}
</script>

{#if showCadrerChallenge}
	<CadrerChallenge 
		onComplete={completeChallenge}
		onBack={goBackFromChallenge}
	/>
{:else}
<div class="challenges-container">
	<!-- Header avec statistiques -->
	<div class="header-section">
		<div class="stats-card">
			<div class="stat-item">
				<div class="stat-number">{getCompletedCount()}</div>
				<div class="stat-label">Défis complétés</div>
			</div>
			<div class="stat-item">
				<div class="stat-number">{challenges.length}</div>
				<div class="stat-label">Total défis</div>
			</div>
			<div class="stat-item">
				<div class="stat-number">{Math.round((getCompletedCount() / challenges.length) * 100)}%</div>
				<div class="stat-label">Progression</div>
			</div>
		</div>
	</div>

	<!-- Défi actif -->
	{#if isChallengeActive && activeChallenge}
		<div class="active-challenge-section">
			<MobileCard title="Défi en cours" class="active-challenge-card">
				<div class="challenge-info">
					<div class="challenge-icon">{activeChallenge.icon}</div>
					<div class="challenge-details">
						<h3>{activeChallenge.title}</h3>
						<p>{activeChallenge.description}</p>
					</div>
				</div>
				
				<div class="timer-display">
					<div class="timer-circle">
						<div class="timer-text">{formatTime(challengeTimer)}</div>
					</div>
				</div>

				<div class="challenge-actions">
					<MobileButton 
						variant="primary" 
						on:click={() => completeChallenge(true)}
						class="success-button"
					>
						✅ J'ai réussi !
					</MobileButton>
					<MobileButton 
						variant="ghost" 
						on:click={() => completeChallenge(false)}
					>
						❌ Abandonner
					</MobileButton>
				</div>
			</MobileCard>
		</div>
	{/if}

	<!-- Liste des défis -->
	<div class="challenges-list">
		<h2>Défis disponibles</h2>
		<div class="challenges-grid">
			{#each challenges as challenge}
				<MobileCard 
					title={challenge.title}
					class="challenge-card {challenge.completed ? 'completed' : ''}"
					clickable={!isChallengeActive && !challenge.completed}
					on:click={() => !isChallengeActive && !challenge.completed && startChallenge(challenge)}
				>
					<div class="challenge-content">
						<div class="challenge-icon">{challenge.icon}</div>
						<div class="challenge-info">
							<p class="challenge-description">{challenge.description}</p>
							<div class="challenge-meta">
								<span class="difficulty" style="color: {getDifficultyColor(challenge.difficulty)}">
									{challenge.difficulty}
								</span>
								<span class="time-limit">{challenge.timeLimit} min</span>
							</div>
						</div>
						{#if challenge.completed}
							<div class="completed-badge">✅</div>
						{:else if !isChallengeActive}
							<div class="start-arrow">→</div>
						{/if}
					</div>
				</MobileCard>
			{/each}
		</div>
	</div>

	<!-- Défis complétés -->
	{#if getCompletedCount() > 0}
		<div class="completed-section">
			<h3>Défis complétés</h3>
			<div class="completed-list">
				{#each challenges.filter(c => c.completed) as challenge}
					<div class="completed-item">
						<span class="completed-icon">{challenge.icon}</span>
						<span class="completed-title">{challenge.title}</span>
						<span class="completed-date">
							{challenge.completedAt?.toLocaleDateString('fr-FR')}
						</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
{/if}

<style>
	.challenges-container {
		min-height: 100vh;
		background: #f8fafc;
		padding: 1rem;
	}

	.header-section {
		margin-bottom: 2rem;
	}

	.stats-card {
		background: white;
		border-radius: 1rem;
		padding: 1.5rem;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.stat-item {
		text-align: center;
	}

	.stat-number {
		font-size: 2rem;
		font-weight: 700;
		color: #3b82f6;
		margin-bottom: 0.25rem;
	}

	.stat-label {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.active-challenge-section {
		margin-bottom: 2rem;
	}

	.active-challenge-card {
		background: linear-gradient(135deg, #3b82f6, #1d4ed8);
		color: white;
	}

	.challenge-info {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.challenge-icon {
		font-size: 3rem;
	}

	.challenge-details h3 {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
	}

	.challenge-details p {
		margin: 0;
		opacity: 0.9;
	}

	.timer-display {
		display: flex;
		justify-content: center;
		margin-bottom: 1.5rem;
	}

	.timer-circle {
		width: 120px;
		height: 120px;
		border: 4px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.1);
	}

	.timer-text {
		font-size: 1.5rem;
		font-weight: 700;
		font-family: monospace;
	}

	.challenge-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.success-button {
		background: #10b981;
		border-color: #10b981;
	}

	.success-button:hover {
		background: #059669;
		border-color: #059669;
	}

	.challenges-list {
		margin-bottom: 2rem;
	}

	.challenges-list h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 1rem 0;
	}

	.challenges-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	.challenge-card {
		transition: all 0.2s ease;
	}

	.challenge-card.completed {
		opacity: 0.7;
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
	}

	.challenge-content {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.challenge-icon {
		font-size: 2rem;
		flex-shrink: 0;
	}

	.challenge-info {
		flex: 1;
	}

	.challenge-description {
		margin: 0 0 0.5rem 0;
		color: #374151;
		line-height: 1.4;
	}

	.challenge-meta {
		display: flex;
		gap: 1rem;
		font-size: 0.875rem;
	}

	.difficulty {
		font-weight: 600;
		text-transform: capitalize;
	}

	.time-limit {
		color: #6b7280;
	}

	.completed-badge {
		font-size: 1.5rem;
	}

	.start-arrow {
		font-size: 1.25rem;
		color: #3b82f6;
		font-weight: bold;
	}

	.completed-section {
		background: white;
		border-radius: 1rem;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.completed-section h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 1rem 0;
	}

	.completed-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.completed-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: #f8fafc;
		border-radius: 0.5rem;
	}

	.completed-icon {
		font-size: 1.25rem;
	}

	.completed-title {
		flex: 1;
		font-weight: 500;
		color: #1f2937;
	}

	.completed-date {
		font-size: 0.875rem;
		color: #6b7280;
	}

	/* Responsive */
	@media (min-width: 640px) {
		.challenges-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		
		.stats-card {
			padding: 2rem;
		}
	}

	@media (min-width: 1024px) {
		.challenges-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}
</style>