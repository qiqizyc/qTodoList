<template>
  <!--通过ConfigProvider关闭全局的Wave效果（即涟漪效果）-->
  <a-config-provider :wave="{ disabled: true }" :locale="zhCN">
    <a-layout style="min-height: 100vh; background: #f0f2f5;">
      <!--header页头-->
      <a-layout-header style="padding: 0 24px; display: flex; align-items: center; justify-content: space-between;
          box-shadow: 0 1px 4px rgba(0,21,41,0.08); background: #fff; z-index: 10;">
        <a-page-header style="padding: 0; flex: 1;" title="待办事项" sub-title="qiqinb的todolist" />
        <a-button type="primary" @click="showModal"> + 新建事项 </a-button>
      </a-layout-header>
      <!--content内容-->
      <a-layout-content style="padding: 24px; max-width: 1200px; margin: 0 auto; width: 100%;">
        <!--################################################################################################################################################-->
        <!--上方的状态卡片。使用24分栏布局-->
        <a-row :gutter="[24, 24]" style="margin-bottom: 24px;">
          <a-col :span="8">
            <a-card :bordered="false" :class="['stat-card', { 'active-card': currentFilter === 'all' }]" @click="currentFilter = 'all'" >
              <a-statistic title="总数量" :value="totalCount" :value-style="{ color: '#1890ff', fontWeight: 'bold' }"></a-statistic>
            </a-card>
          </a-col>
          <a-col :span="8">
            <a-card :bordered="false" :class="['stat-card', { 'active-card': currentFilter === 'active' }]" @click="currentFilter = 'active'">
              <a-statistic title="未完成" :value="pendingCount" :value-style="{ color: '#faad14', fontWeight: 'bold' }"></a-statistic>
            </a-card>
          </a-col>
          <a-col :span="8">
            <a-card :bordered="false" :class="['stat-card', { 'active-card': currentFilter === 'done' }]" @click="currentFilter = 'done'" >
              <a-statistic title="已完成" :value="doneCount" :value-style="{ color: '#52c41a', fontWeight: 'bold' }"></a-statistic>
            </a-card>
          </a-col>
        </a-row>
        <!--################################################################################################################################################-->
        <!--页面正中的todolist卡片。包含一个a-table组件-->
        <a-card :bordered="false" style="border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
          <a-table :columns="columns" :data-source="filteredData" :pagination="{ pageSize: 8 }" rowKey="key" bordered>
            <template #headerCell="{title}">
              <template v-if="title === '标签'">
                <div style="width: 100%;">
                  <span style="display: inline-block; vertical-align: middle;">标签</span>
                  <a-select v-model:value="selectedColor" style="width: 80px;float: right;padding:0;">
                    <a-select-option v-for="({name,color}) in colors" :value="color" :style="{color: color}">
                        {{name}}
                    </a-select-option>
                    <!-- 自定义颜色选项 -->
                    <a-select-option value="custom">自定义颜色</a-select-option>
                  </a-select>
                </div>
              </template>
            </template>



            <template #bodyCell="{ column, record }">
              <!--如果是status这一列，则添加a-checkbox组件-->
              <template v-if="column.dataIndex === 'status'">
                <a-checkbox v-model:checked="record.status" style="transform: scale(1.1);"></a-checkbox>
              </template>
              <!--如果是content这一列，逻辑：
              1、正常情况下，展示原本的内容（即span组件）
              2、当正在修改某一行时，隐藏原本的内容，并添加 用于修改当前行的输入框a-input。（即div组件）-->
              <template v-if="column.dataIndex === 'content'">
                <div v-if="record.isEditing">
                  <a-input v-model:value="record.tempContent" @pressEnter="saveEdit(record)" />
                </div>
                <span v-else :class="['todo-content', { 'todo-done': record.status }]">
                {{ record.content }}
              </span>
              </template>
              <!--如果是tags这一列，则根据每行内容，动态添加a-tag组件-->
              <template v-if="column.dataIndex === 'tags'">
                <!--<a-tag v-for="tag in record.tags" :key="tag" color="blue">{{ tag }}</a-tag>-->
                  <a-tag v-for="tag in record.tags" :key="tag" :color="selectedColor" class="no-select tag1 ellipsis-tag">{{ tag }}</a-tag>
              </template>
              <!--如果是action这一列，增加 保存和删除 两个按钮，以及对应的逻辑-->
              <template v-if="column.dataIndex === 'action'">
                <div class="action-buttons">
                  <!--如果正在修改，展示 保存和取消 按钮-->
                  <template v-if="record.isEditing">
                    <a-popconfirm title="确定保存修改吗？" ok-text="保存" cancel-text="取消" @confirm="saveEdit(record)">
                      <a-typography-link>保存</a-typography-link>
                    </a-popconfirm>
                    <a-divider type="vertical" />
                    <a-typography-link type="secondary" @click="cancelEdit(record)">取消</a-typography-link>
                  </template>

                  <template v-else>
                    <a-typography-link @click="startEdit(record)">编辑</a-typography-link>
                    <a-divider type="vertical" />
                    <a-popconfirm title="确定删除这条待办吗？" ok-text="删除" cancel-text="取消" @confirm="deleteTodo(record.key)">
                      <a-typography-link type="danger">删除</a-typography-link>
                    </a-popconfirm>
                  </template>
                </div>
              </template>

            </template>
          </a-table>
        </a-card>
      </a-layout-content>
      <!--############################################################################################################-->
      <!--页面上方的弹窗（仅modalVisible为true时显示）-->
      <a-modal v-model:visible="modalVisible" title="✨ 新建待办事项" @ok="handleOk" okText="创建" cancelText="取消" centered >
        <a-form layout="vertical">
          <a-form-item label="待办内容">
            <a-textarea v-model:value="newItemContent" placeholder="接下来要做什么？" :rows="3" allow-clear
                        show-count :maxlength="300" @keydown.enter="handleKeydown"/>

          </a-form-item>
          <a-form-item label="标签 (可选)">
            <a-select v-model:value="newItemTags" mode="tags" style="width: 100%" placeholder="输入标签后回车，例如：工作、生活" :token-separators="[',']"
            :options="options" :max-tag-text-length="12" :max-tag-count="8">
              <template #maxTagPlaceholder="omittedValues">
                <span style="color: red">+ {{ omittedValues.length }} ...</span>
              </template>
            </a-select>
          </a-form-item>
        </a-form>
      </a-modal>

    </a-layout>
  </a-config-provider>
</template>




<script setup>
import { ref, computed, watch} from 'vue';
import { message } from 'ant-design-vue';

import zhCN from 'ant-design-vue/es/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';


//localStorage的Key
const STORAGE_KEY = 'qiqinb-todos-v1'; //加入版本号便于未来数据迁移




//####################################多语言相关的配置（中文简体）####################################
dayjs.locale('zh-cn');

//####################################从localStorage加载数据的函数####################################
const loadFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map(item => ({...item,isEditing: false,tempContent: ''}));//确保每个todo都有必要的字段
    }
  } catch (error) {
    message.error('读取localStorage失败:', error);
  }
  // 如果没有任何数据，返回空数组
  return [];
};

//####################################表格列配置（两个数组，第二个数组`data`位于 监听变化部分）####################################
const columns = [
  { title: '状态', dataIndex: 'status', width: 64, align: 'center' },
  { title: '待办事项内容', dataIndex: 'content', ellipsis: true },
  { title: '标签', dataIndex: 'tags', width: 200},
  { title: '操作', dataIndex: 'action', width: 150, align: 'center' },
];
/*
const data = ref([
  { key: 1, status: false, content: '把TodoList搞完（）', tags: ['编程'], isEditing: false, tempContent: '' }
]);
*/
const data = ref(loadFromStorage());

//####################################监听变化，当更新时存入localStorage####################################
watch(data, (newData) => {
  try {
    //保存时去掉临时状态字段
    const dataToSave = newData.map(({ isEditing, tempContent, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (error) {
    message.error('保存到localStorage失败:', error);
  }
}, {
  deep: true,      //深度监听对象内部变化
  immediate: true  //立即执行一次，确保初始状态被保存
});
//####################################状态卡片的状态 有三种：all、active、done####################################
const currentFilter = ref('all');


//####################################统计、筛选逻辑####################################
const totalCount = computed(() => data.value.length);
const pendingCount = computed(() => data.value.filter(item => !item.status).length);
const doneCount = computed(() => data.value.filter(item => item.status).length);

//根据当前筛选器返回展示的数据
const filteredData = computed(() => {
  if (currentFilter.value === 'active') {
    return data.value.filter(item => !item.status);
  } else if (currentFilter.value === 'done') {
    return data.value.filter(item => item.status);
  }
  return data.value;
});
//####################################新建todo####################################
const modalVisible = ref(false); //
const newItemContent = ref('');
const newItemTags = ref([]); //存储新标签
//展示弹窗的函数
const showModal = () => {
  newItemContent.value = '';
  newItemTags.value = [];
  modalVisible.value = true;
};
//增加todo的函数
const handleOk = () => {
  if (!newItemContent.value.trim()) {
    message.warning('请输入内容！');
    return;
  }
  data.value.unshift({ //使用unshift，放到最前面
    key: Date.now(),
    status: false,
    content: newItemContent.value,
    tags: [...newItemTags.value], //保存标签副本
    isEditing: false,
    tempContent: ''
  });
  modalVisible.value = false;
  message.success('添加成功');
};

//####################################编辑与删除逻辑####################################

//1、删除
const deleteTodo = (key) => {
  data.value = data.value.filter(item => item.key !== key);
  message.success('删除成功');
};

//2、开始编辑
const startEdit = (record) => {
  record.tempContent = record.content; //将当前内容暂存到 tempContent
  record.isEditing = true;
};

//3、取消编辑
const cancelEdit = (record) => {
  record.isEditing = false;
  record.tempContent = '';
};

//4、保存编辑 (需浮窗确认)
const saveEdit = (record) => {
  if (!record.tempContent.trim()) {
    message.warning('内容不能为空');
    return;
  }
  record.content = record.tempContent; //将暂存内容写入正式内容
  record.isEditing = false;
  message.success('修改已保存');
};



//颜色：pink red orange green cyan blue purple
//const colors = ['pink','red','orange','green','cyan','blue','purple'];
const colors = [
  { name: '红色', color: 'red' },
  { name: '橙色', color: 'orange' },
  { name: '黄色', color: 'yellow' },
  { name: '绿色', color: 'green' },
  { name: '蓝色', color: 'blue' },
  { name: '青色', color: 'cyan' },
  { name: '紫色', color: 'purple' },
];
const selectedColor = ref('blue');



const options = [
  {value: '学习'},
  {value: '工作'},
  {value: '生活'},
  {value: '编程'},
  {value: '购物'},
];

const handleKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault(); // 阻止回车换行
    message.warn('请不要按Enter哦')
  }
};
</script>



<style>
/*
.ant-wave { display: none !important; }
（已通过ConfigProvider禁用wave，css无需再设置。）*/

/*关闭 按钮、输入框、选择器 的阴影效果，必须保留！！*/
.ant-btn-primary { box-shadow: none !important; }
.ant-input:focus { box-shadow: none !important; }
.ant-select-selector{ box-shadow: none !important; }

:deep(.ant-page-header-heading-title) { font-size: 18px; font-weight: 600; }
:deep(.ant-page-header-heading-sub-title) { font-size: 13px; color: #8c8c8c; }

.todo-content { font-size: 15px; color: #262626; transition: all 0.3s ease; display: block; padding: 4px 0; }
.todo-done { text-decoration: line-through; color: #bfbfbf; font-style: italic; }

/* 新增样式 */
.stat-card { border-radius: 8px; cursor: pointer; transition: all 0.3s; border: 1px solid transparent; }
/* 选中卡片的样式效果 */
.active-card { border-color: #1890ff; background-color: #e6f7ff; }


.ant-tag.tag1{ transition: all 0.3s ease; margin: 2px 4px 2px 0; }
.ant-tag:hover.tag1{ transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);}


.no-select {
  user-select: none;
  -webkit-user-select: none; /* Safari */
  -moz-user-select: none; /* Firefox */
  -ms-user-select: none; /* IE/Edge */
}


.ellipsis-tag {
  max-width: 100px; /* 设置最大宽度 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  vertical-align: middle;
}
</style>