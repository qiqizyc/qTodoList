<template>
  <a-config-provider :locale="zhCN" :theme="themeConfig" :wave="{ disabled: true }">
    <a-layout class="app-layout">

      <a-layout-header style="padding: 0 20px; display: flex; align-items: center; justify-content: space-between;
          box-shadow: 0 1px 4px rgba(0,21,41,0.08); background: #fff; z-index: 10;">
        <img src="/favicon.png" height="48" width="48"/>
        <a-page-header style="padding: 0; flex: 1;margin-left: 10px;" title="待办事项" sub-title="qiqinb的todolist"/>
        <a-button type="primary" @click="handleOpenModal()" size="large">
          <template #icon><plus-outlined /></template>
          新建事项
          </a-button>
      </a-layout-header>

      <a-layout-content class="app-content">
        <div class="stats-container">
          <a-row :gutter="gutter">
            <a-col :xs="24" :md="8" v-for="card in statCards" :key="card.type">
              <div :class="['stat-card', { active: filterType === card.type }]"
                  @click="filterType = card.type">
                <div class="stat-icon" :style="{ background: card.bg }">{{ card.icon }}</div>
                <div class="stat-info">
                  <div class="stat-label">{{ card.title }}</div>
                  <div class="stat-value">{{ card.value }}</div>
                </div>
                <a-progress
                    type="circle"
                    :percent="card.percent"
                    :size="40"
                    :stroke-color="card.color"/>
              </div>
            </a-col>
          </a-row>
        </div>

        <a-card :bordered="false" class="list-card-wrapper">
          <div class="table-toolbar">
            <div class="left">
              <a-radio-group v-model:value="filterType" button-style="solid">
                <a-radio-button value="all">全部</a-radio-button>
                <a-radio-button value="active">进行中</a-radio-button>
                <a-radio-button value="done">已完成</a-radio-button>
              </a-radio-group>
            </div>
            <div class="right">
              <a-button v-if="stats.completed > 0" type="link" danger @click="clearCompleted">
                清理已完成
              </a-button>
            </div>
          </div>

          <a-table
              :columns="columns"
              :data-source="filteredData"
              :pagination="paginationConfig"
              row-key="id"
              :loading="loading"
              class="custom-table">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <a-checkbox
                    :checked="record.status"
                    @change="toggleStatus(record)"
                    class="custom-checkbox"
                />
              </template>

              <template v-if="column.key === 'content'">
                <div class="content-cell">
                  <div
                      :class="['todo-text', { 'is-done': record.status }]"
                      @dblclick="handleOpenModal(record)"
                  >
                    {{ record.content }}
                  </div>
                  <div class="todo-time">{{ formatDate(record.createTime) }}</div>
                </div>
              </template>

              <template v-if="column.key === 'tags'">
                <a-space wrap>
                  <a-tag
                      v-for="tag in record.tags"
                      :key="tag"
                      :color="record.tagColor || 'blue'"
                      @close="removeTag(record, tag)"
                      class="ellipsis-tag"
                  >
                    {{ tag }}
                  </a-tag>
                </a-space>
              </template>

              <template v-if="column.key === 'action'">
                <a-space>
                  <a-button type="text" size="small" @click="handleOpenModal(record)">
                    <edit-outlined />
                  </a-button>
                  <a-popconfirm title="确定删除吗？" @confirm="deleteTodo(record.id)">
                    <a-button type="text" size="small" danger>
                      <delete-outlined />
                    </a-button>
                  </a-popconfirm>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-card>
      </a-layout-content>

      <a-modal
          v-model:open="modalVisible"
          :title="formState.id ? '编辑任务' : '添加新任务'"
          @ok="handleModalSubmit"
          :confirm-loading="submitting"
          centered
          destroyOnClose>
        <a-form layout="vertical">
          <a-form-item label="任务描述" required>
            <a-textarea
                v-model:value="formState.content"
                placeholder="输入任务详情..."
                :rows="4"
                show-count
                :maxlength="200"/>
          </a-form-item>
          <a-form-item label="分类标签">
            <a-select v-model:value="formState.tags" mode="tags" placeholder="选择或输入新标签">
              <a-select-option v-for="tag in presetTags" :key="tag">{{ tag }}</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="标记颜色">
            <div class="color-picker">
              <div
                  v-for="color in colorOptions"
                  :key="color.value"
                  :class="['color-item', { active: formState.tagColor === color.value }]"
                  :style="{ background: color.hex }"
                  @click="formState.tagColor = color.value"
              />
            </div>
          </a-form-item>
        </a-form>
      </a-modal>
    </a-layout>
  </a-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted, onUnmounted} from 'vue'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import dayjs from 'dayjs'
import { useDebounceFn } from '@vueuse/core'
import {message} from "ant-design-vue";

// --- 类型与常量 ---
interface Todo {
  id: string
  content: string
  status: boolean
  tags: string[]
  tagColor: string
  createTime: number
}

const STORAGE_KEY = 'v3-todo-pro-data'
const presetTags = ['工作', '生活', '重要', '学习']
const colorOptions = [
  { value: 'blue', hex: '#1890ff' },
  { value: 'green', hex: '#52c41a' },
  { value: 'orange', hex: '#faad14' },
  { value: 'red', hex: '#f5222d' },
  { value: 'purple', hex: '#722ed1' }
]

// --- 核心业务逻辑 (Composable) ---
function useTodoLogic() {
  const todos = ref<Todo[]>(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))
  const loading = ref(false)

  const save = useDebounceFn((data: Todo[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, 500)

  watch(todos, (val) => save(val), { deep: true })

  const stats = computed(() => {
    const total = todos.value.length
    const completed = todos.value.filter(t => t.status).length
    return {
      total,
      completed,
      pending: total - completed,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100)
    }
  })

  return { todos, stats, loading }
}

const { todos, stats, loading } = useTodoLogic()

// --- UI 状态 ---
const filterType = ref<'all' | 'active' | 'done'>('all')
const modalVisible = ref(false)
const submitting = ref(false)
const formState = reactive({
  id: '',
  content: '',
  tags: [] as string[],
  tagColor: 'blue'
})

// --- 计算属性 ---
const filteredData = computed(() => {
  return todos.value.filter(item => {
    if (filterType.value === 'active') return !item.status
    if (filterType.value === 'done') return item.status
    return true
  }).sort((a, b) => b.createTime - a.createTime)
})

const statCards = computed(() => [
  { type: 'all', title: '全部任务', value: stats.value.total, icon: '📋', color: '#1890ff', bg: '#e6f7ff', percent: 100 },
  { type: 'active', title: '待处理', value: stats.value.pending, icon: '⏳', color: '#faad14', bg: '#fffbe6', percent: 100 - stats.value.percent },
  { type: 'done', title: '已完成', value: stats.value.completed, icon: '✅', color: '#52c41a', bg: '#f6ffed', percent: stats.value.percent },
])

// --- 方法 ---
const handleOpenModal = (record?: Todo) => {
  if (record) {
    formState.id = record.id
    formState.content = record.content
    formState.tags = [...record.tags]
    formState.tagColor = record.tagColor
  } else {
    Object.assign(formState, { id: '', content: '', tags: [], tagColor: 'blue' })
  }
  modalVisible.value = true
}

const handleModalSubmit = async () => {
  if (!formState.content.trim()) return message.warning('请输入内容')

  submitting.value = true
  try {
    if (formState.id) {
      const index = todos.value.findIndex(t => t.id === formState.id)
      if (index !== -1) todos.value[index] = { ...todos.value[index], ...formState }
    } else {
      todos.value.push({
        ...formState,
        id: Date.now().toString(),
        status: false,
        createTime: Date.now()
      })
    }
    modalVisible.value = false
    message.success('保存成功')
  } finally {
    submitting.value = false
  }
}

const toggleStatus = (record: Todo) => {
  record.status = !record.status
}

const deleteTodo = (id: string) => {
  todos.value = todos.value.filter(t => t.id !== id)
}

const removeTag = (record: Todo, tag: string) => {
  record.tags = record.tags.filter(t => t !== tag)
}

const clearCompleted = () => {
  todos.value = todos.value.filter(t => !t.status)
  message.success('已清理所有已完成任务')
}

const formatDate = (ts: number) => dayjs(ts).format('MM-DD HH:mm')

// --- 表格配置 ---
const columns = [
  { title: '状态', key: 'status', width: 60, align: 'center' },
  { title: '任务详情', key: 'content' },
  { title: '分类', key: 'tags', width: 200 },
  { title: '操作', key: 'action', width: 100, align: 'right' }
]

const paginationConfig = {
  pageSize: 6,
  showTotal: (total: number) => `共 ${total} 项`
}

const themeConfig = {
  token: {
    borderRadius: 10,
    fontFamily: 'Inter, system-ui, sans-serif'
  }
}





const gutter = ref([24, 24])
let mediaQuery = null
const updateGutter = () => {
  const isMobile = window.matchMedia('(max-width: 768px)').matches
  gutter.value = isMobile ? [24, 8] : [24, 24]
}
onMounted(() => {
  mediaQuery = window.matchMedia('(max-width: 768px)')
  updateGutter()
  mediaQuery.addEventListener('change', updateGutter)
})
onUnmounted(() => {
  if (mediaQuery) {
    mediaQuery.removeEventListener('change', updateGutter)
  }
})
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  background-color: #f8fafc;
}

.header-content {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-content {
  width: auto;
  min-width: 900px;
  margin: 0 auto;
  padding: 32px 24px;
}

/* 统计卡片 */
.stat-card {
  background: white;
  padding: 24px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
}

.stat-card.active {
  border-color: #1890ff;
  background: #f0f7ff;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.stat-info { flex: 1; }
.stat-label { color: #64748b; font-size: 14px; }
.stat-value { font-size: 24px; font-weight: 800; color: #1e293b; }

/* 列表包装器 */
.list-card-wrapper {
  margin-top: 32px;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

/* 任务文本样式 */
.content-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.todo-text {
  font-size: 15px;
  color: #334155;
  font-weight: 500;
  transition: all 0.2s;
}

.todo-text.is-done {
  text-decoration: line-through;
  color: #94a3b8;
}

.todo-time {
  font-size: 12px;
  color: #cbd5e1;
}

/* 自定义复选框圆角 */
.custom-checkbox :deep(.ant-checkbox-inner) {
  border-radius: 6px;
}

/* 颜色选择器 */
.color-picker {
  display: flex;
  gap: 12px;
}

.color-item {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  border: 3px solid transparent;
}

.color-item.active {
  transform: scale(1.2);
  border-color: #cbd5e1;
}

@media (max-width: 768px) {
  .app-header { padding: 0 16px; }
  .stat-card { padding: 16px; }
  .app-content { min-width: 200px; padding: 24px 6px;}
  .stat-card:hover {
    transform: translateY(-2px);
  }
}


.ellipsis-tag {
  max-width: 100px; /* 设置最大宽度 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  vertical-align: middle;
}

/*关闭 按钮、输入框、选择器 的阴影效果，必须保留！！*/
.ant-btn-primary { box-shadow: none !important; }
.ant-input:focus { box-shadow: none !important; }
.ant-select-selector{ box-shadow: none !important; }



.ant-tag{ transition: all 0.3s ease; margin: 2px 4px 2px 0; }
.ant-tag:hover{ transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);}
</style>
