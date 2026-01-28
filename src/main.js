import {createApp} from "vue";
import App from './App-v3.vue';

import {
    ConfigProvider,
    Layout,
    Row,
    Col,
    PageHeader,
    Button,
    Card,
    Progress,
    Radio,
    Table,
    Checkbox,
    Tag,
    Space,
    Popconfirm,
    Modal,
    Form,
    Input,
    Select,
    message
} from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css';

const app = createApp(App);

app.use(ConfigProvider)
app.use(Layout)
app.use(Row)
app.use(Col)
app.use(PageHeader)
app.use(Button)
app.use(Card)
app.use(Progress)
app.use(Radio)
app.use(Table)
app.use(Checkbox)
app.use(Tag)
app.use(Space)
app.use(Popconfirm)
app.use(Modal)
app.use(Form)
app.use(Input)
app.use(Select)
app.config.globalProperties.$message = message
app.mount("#app");
