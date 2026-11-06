import { createStore } from 'vuex';
import app from './modules/app/index.js';

export default createStore({
	modules: {
		app,
	},
});
