<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	let isOpen = false;

	function toggleMenu() {
		isOpen = !isOpen;
	}

	function closeMenu() {
		isOpen = false;
	}

	function handleNavClick(event: MouseEvent) {
		closeMenu();
		dispatch('navigate', { href: (event.target as HTMLAnchorElement).href });
	}
</script>

<nav class="mobile-nav" class:open={isOpen}>
	<div class="nav-header">
		<button class="menu-toggle" on:click={toggleMenu} aria-label="Menu">
			<span class="hamburger" class:active={isOpen}></span>
			<span class="hamburger" class:active={isOpen}></span>
			<span class="hamburger" class:active={isOpen}></span>
		</button>
		<h2 class="nav-title">La Lumière</h2>
		<div class="nav-spacer"></div>
	</div>

	<div class="nav-menu" class:open={isOpen}>
		<a href="/" class="nav-link" on:click={handleNavClick}>
			<span class="nav-icon">🏠</span>
			Accueil
		</a>
		<a href="/about" class="nav-link" on:click={handleNavClick}>
			<span class="nav-icon">ℹ️</span>
			À propos
		</a>
		<a href="/settings" class="nav-link" on:click={handleNavClick}>
			<span class="nav-icon">⚙️</span>
			Paramètres
		</a>
		<a href="/help" class="nav-link" on:click={handleNavClick}>
			<span class="nav-icon">❓</span>
			Aide
		</a>
	</div>

	{#if isOpen}
		<div class="nav-overlay" on:click={closeMenu} on:keydown={(e) => e.key === 'Enter' && closeMenu()} role="button" tabindex="0"></div>
	{/if}
</nav>

<style>
	.mobile-nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 1000;
		background: white;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.nav-header {
		display: flex;
		align-items: center;
		padding: 1rem 1.5rem;
		min-height: 60px;
	}

	.menu-toggle {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.hamburger {
		width: 24px;
		height: 2px;
		background: #374151;
		transition: all 0.3s ease;
		transform-origin: center;
	}

	.hamburger.active:nth-child(1) {
		transform: rotate(45deg) translate(5px, 5px);
	}

	.hamburger.active:nth-child(2) {
		opacity: 0;
	}

	.hamburger.active:nth-child(3) {
		transform: rotate(-45deg) translate(7px, -6px);
	}

	.nav-title {
		font-size: 1.2rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
		flex: 1;
		text-align: center;
	}

	.nav-spacer {
		width: 40px;
	}

	.nav-menu {
		position: fixed;
		top: 60px;
		left: 0;
		right: 0;
		background: white;
		transform: translateX(-100%);
		transition: transform 0.3s ease;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
		max-height: calc(100vh - 60px);
		overflow-y: auto;
	}

	.nav-menu.open {
		transform: translateX(0);
	}

	.nav-link {
		display: flex;
		align-items: center;
		padding: 1rem 1.5rem;
		text-decoration: none;
		color: #374151;
		border-bottom: 1px solid #f3f4f6;
		transition: background-color 0.2s ease;
		min-height: 44px;
	}

	.nav-link:hover {
		background-color: #f9fafb;
	}

	.nav-link:active {
		background-color: #f3f4f6;
	}

	.nav-icon {
		font-size: 1.2rem;
		margin-right: 1rem;
		width: 24px;
		text-align: center;
	}

	.nav-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: -1;
	}

	/* Animation d'entrée pour les liens */
	.nav-link {
		animation: slideInLeft 0.3s ease-out;
	}

	.nav-link:nth-child(1) { animation-delay: 0.1s; }
	.nav-link:nth-child(2) { animation-delay: 0.15s; }
	.nav-link:nth-child(3) { animation-delay: 0.2s; }
	.nav-link:nth-child(4) { animation-delay: 0.25s; }

	@keyframes slideInLeft {
		from {
			opacity: 0;
			transform: translateX(-20px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	/* Styles pour les écrans plus larges */
	@media (min-width: 768px) {
		.mobile-nav {
			position: static;
			box-shadow: none;
			border-bottom: 1px solid #e5e7eb;
		}

		.nav-menu {
			position: static;
			transform: none;
			box-shadow: none;
			display: flex;
			background: none;
			max-height: none;
			overflow: visible;
		}

		.nav-link {
			border-bottom: none;
			padding: 0.5rem 1rem;
			margin: 0 0.25rem;
			border-radius: 0.5rem;
		}

		.nav-link:hover {
			background-color: #f3f4f6;
		}

		.menu-toggle {
			display: none;
		}

		.nav-title {
			text-align: left;
		}
	}
</style>
