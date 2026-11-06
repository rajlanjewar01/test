import { mount } from '@vue/test-utils';
import { expect } from 'chai';
import SampleCounter from '../src/components/common/SampleCounter.vue';

const mountCounter = (props = {}) =>
	mount(SampleCounter, { props: { label: 'Increase', ...props } });

describe('mounting a component in jsdom', () => {
	it('runs in a jsdom environment', () => {
		expect(globalThis.window.navigator.userAgent).to.include('jsdom');
		expect(globalThis.document.body).to.not.equal(undefined);
	});

	it('mounts an SFC and renders its template and props', () => {
		const wrapper = mountCounter();
		expect(wrapper.element.tagName).to.equal('BUTTON');
		expect(wrapper.text()).to.equal('0');
		expect(wrapper.attributes('aria-label')).to.equal('Increase');
	});

	it('updates the DOM and emits an event after a click', async () => {
		const wrapper = mountCounter();
		await wrapper.trigger('click');
		expect(wrapper.text()).to.equal('1');
		expect(wrapper.emitted('change')).to.deep.equal([[1]]);
	});

	it('disables the button when the maximum is reached', async () => {
		const wrapper = mountCounter({ max: 1 });
		await wrapper.trigger('click');
		expect(wrapper.attributes('disabled')).to.not.equal(undefined);
	});

	it('ignores increments once the maximum is reached', async () => {
		const wrapper = mountCounter({ max: 1 });
		await wrapper.trigger('click');
		wrapper.vm.increment();
		await wrapper.vm.$nextTick();
		expect(wrapper.text()).to.equal('1');
		expect(wrapper.emitted('change')).to.have.length(1);
	});
});
