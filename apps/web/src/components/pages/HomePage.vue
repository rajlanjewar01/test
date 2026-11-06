<template>
	<main class="home-page">
		<h1>BigDaddy</h1>
		<SampleCounter label="Count" />
	</main>
</template>

<script>
import SampleCounter from '@CommonComponents/SampleCounter.vue';

export default {
	name: 'HomePage',

	components: { SampleCounter },
};
</script>

<style scoped>
.home-page {
	max-width: 960px;
	margin: 0 auto;
	padding: 2rem;
}
</style>
