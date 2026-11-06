import * as types from './constant.js';
import { getAppInfo } from '../../../lib/app-info.js';

const _state = {
	info: getAppInfo(),
	loading: false,
};

const getters = {
	[types.GET_APP_INFO]: (state) => state.info,
	[types.GET_IS_LOADING]: (state) => state.loading,
};

const mutations = {
	[types.SET_LOADING](state, value) {
		state.loading = value;
	},
};

const actions = {
	[types.INIT](context) {
		context.commit(types.SET_LOADING, false);
	},
};

export default {
	namespaced: true,
	state: _state,
	getters,
	mutations,
	actions,
};
