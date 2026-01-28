<template>
  <a-layout style="min-height: 100vh; background: #f0f2f5;">

    <a-layout-header style="background: #fff; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 4px rgba(0,21,41,0.08); z-index: 10;">
      <a-page-header style="padding: 0; flex: 1;" title="待办事项" sub-title="qiqinb的todolist" />
      <a-button type="primary"@click="showModal"> + 新建事项 </a-button>
    </a-layout-header>

    <a-layout-content style="padding: 24px; max-width: 1200px; margin: 0 auto; width: 100%;">

      <a-row :gutter="[24, 24]" style="margin-bottom: 24px;">
        <a-col :span="8">
          <a-card :bordered="false" hoverable style="border-radius: 8px;" @click="">
            <a-statistic title="总数量" :value="10" :value-style="{ color: '#1890ff', fontWeight: 'bold' }"></a-statistic>
          </a-card>
        </a-col>
        <a-col :span="8">
          <a-card :bordered="false" hoverable style="border-radius: 8px;">
            <a-statistic title="未完成" :value="10" :value-style="{ color: '#faad14', fontWeight: 'bold' }"></a-statistic>
          </a-card>
        </a-col>
        <a-col :span="8">
          <a-card :bordered="false" hoverable style="border-radius: 8px;">
            <a-statistic title="已完成" :value="10" :value-style="{ color: '#52c41a', fontWeight: 'bold' }"></a-statistic>
          </a-card>
        </a-col>
      </a-row>

      <a-card :bordered="false" style="border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
        <a-table :columns="columns" :data-source="data" :pagination="{ pageSize: 8 }" rowKey="key" bordered>
          <template #bodyCell="{ column, record }">

            <template v-if="column.dataIndex === 'status'">
              <a-checkbox v-model:checked="record.status" style="transform: scale(1.1);"></a-checkbox>
            </template>

            <template v-if="column.dataIndex === 'content'">
              <span :class="['todo-content', { 'todo-done': record.status }]">
                {{ record.content }}
              </span>
            </template>

          </template>
        </a-table>
      </a-card>
    </a-layout-content>

    <a-modal v-model:visible="modalVisible" title="✨ 新建待办事项" @ok="handleOk" okText="创建" cancelText="取消" centered >
      <a-textarea style="margin-top: 8px;" v-model:value="newItemContent" placeholder="接下来要做什么？" :rows="4" allow-clear @pressEnter="handleOk" />
    </a-modal>

  </a-layout>
</template>

<script setup>
import { ref } from 'vue';
import { message } from 'ant-design-vue';

//表格配置
const columns = [
  { title: '状态', dataIndex: 'status', width: 64, align: 'center' },
  { title: '待办事项内容', dataIndex: 'content', ellipsis: true},
];

const data = ref([]);

const modalVisible = ref(false);//对话框的状态变量
const newItemContent = ref('');//输入框的内容存在这里面

const showModal = () => {
  newItemContent.value = '';
  modalVisible.value = true;
};

const handleOk = () => {
  //非空校验
  if (!newItemContent.value.trim()) {
    message.warning('请输入内容！');
    return;
  }
  data.value.push({
    key: Date.now(), //使用时间戳作为唯一key
    status: false,
    content: newItemContent.value
  });
  modalVisible.value = false;
  message.success('添加成功');
};

</script>

<style>
.ant-wave{
  display: none !important;
}
.ant-btn-primary{
  box-shadow: none !important;
}



/* 顶部标题样式微调 */
:deep(.ant-page-header-heading-title) {
  font-size: 18px;
  font-weight: 600;
}
:deep(.ant-page-header-heading-sub-title) {
  font-size: 13px;
  color: #8c8c8c;
}

/* 列表文字过渡效果 */
.todo-content {
  font-size: 15px;
  color: #262626;
  transition: all 0.3s ease;
  display: block;
  padding: 4px 0;
}

.todo-done {
  text-decoration: line-through;
  color: #bfbfbf;
  font-style: italic;
}
</style>