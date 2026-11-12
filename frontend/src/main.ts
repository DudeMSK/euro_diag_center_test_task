import 'ant-design-vue/dist/reset.css';
import './styles.css';

import Alert from 'ant-design-vue/es/alert';
import Button from 'ant-design-vue/es/button';
import Table from 'ant-design-vue/es/table';
import { createApp } from 'vue';

import App from './App.vue';

createApp(App).use(Alert).use(Button).use(Table).mount('#app');
