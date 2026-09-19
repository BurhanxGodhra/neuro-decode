import './styles/tokens.css';
import { registerRoute, startRouter } from './core/router.js';
import { acquisitionScene } from './scenes/acquisition.js';
import { spatialFilterScene } from './scenes/spatialFilter.js';
import { latentSpaceScene } from './scenes/latentSpace.js';

registerRoute('acquisition', acquisitionScene);
registerRoute('spatial-filter', spatialFilterScene);
registerRoute('latent-space', latentSpaceScene);

startRouter();
