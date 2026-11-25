/* Configuración del frontend. Si Spring Boot sirve la web, usa el mismo origen. */
const defaultApiBaseUrl = window.location.port === '8080'
  ? window.location.origin
  : 'http://localhost:8080';

window.COWORKHUB_CONFIG = {
  apiBaseUrl: localStorage.getItem('coworkhub_api_url') || defaultApiBaseUrl
};
