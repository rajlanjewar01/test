import service from '../../../common/service/index.js';
import definitionGet from './definitionGet.js';

export function getHealth(abortController) {
	return service.dispatch(definitionGet, {}, undefined, { abortController });
}
