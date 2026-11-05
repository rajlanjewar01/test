<template>
	<button
		type="button"
		class="sample-counter"
		:aria-label="label"
		:disabled="isAtMax"
		@click="increment"
	>
		{{ count }}
	</button>
</template>

<script>
export default {
	name: 'SampleCounter',
	props: {
		label: { type: String, required: true },
		max: { type: Number, default: 3 },
	},
	emits: ['change'],
	data() {
		return { count: 0 };
	},
	computed: {
		isAtMax() {
			return this.count >= this.max;
		},
	},
	methods: {
		increment() {
			if (this.isAtMax) {
				return;
			}
			this.count += 1;
			this.$emit('change', this.count);
		},
	},
};
</script>
