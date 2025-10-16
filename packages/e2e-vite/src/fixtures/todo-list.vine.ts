import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface TodoItem {
  id: number
  title: string
  state: 'todo' | 'complete' | 'cancel'
}
export interface TodoState {
  todoList: TodoItem[]
  handledList: TodoItem[]
}

export const useTodoStore = defineStore('todoList', {
  state: (): TodoState => {
    return {
      todoList: JSON.parse(((localStorage.getItem('todoList')!))) as TodoItem[] || [],
      handledList: JSON.parse(((localStorage.getItem('handledList')!))) as TodoItem[] || [],
    }
  },
  actions: {
    addTodo(todoData: TodoItem) {
      this.todoList.push(todoData)
      localStorage.setItem('todoList', JSON.stringify(this.todoList))
    },
    cancelTodo(todoData: TodoItem) {
      todoData.state = 'cancel'
      this.handledList.push(todoData)
      const index = this.todoList.findIndex(v => v.id === todoData.id)
      this.todoList.splice(index, 1)
      localStorage.setItem('handledList', JSON.stringify(this.handledList))
      localStorage.setItem('todoList', JSON.stringify(this.todoList))
    },
    completeTodo(todoData: TodoItem) {
      this.handledList.push(todoData)
      const index = this.todoList.findIndex(v => v.id === todoData.id)
      this.todoList.splice(index, 1)
      todoData.state = 'complete'
      localStorage.setItem('handledList', JSON.stringify(this.handledList))
      localStorage.setItem('todoList', JSON.stringify(this.todoList))
    },
    deleteTodo(todoData: TodoItem) {
      const index = this.handledList.findIndex(v => v.id === todoData.id)
      this.handledList.splice(index, 1)
      localStorage.setItem('handledList', JSON.stringify(this.handledList))
    },
  },
})

function ToDoAction() {
  const state = vineProp<string>()
  const showDelete = vineProp.withDefault(false)
  const emits = vineEmits(['complete', 'delete', 'cancel'])

  return vine`
    <div class="flex items-center">
      <div
        v-if="state === 'complete'"
        class="complete i-mdi-check-circle text-3xl cursor-default text-green-500"
      />
      <div
        v-else-if="state === 'cancel'"
        class="cancel i-mdi-close text-3xl cursor-default text-red-500"
      />
      <div v-else class="flex items-center">
        <div
          class="todo-complete-btn bg-coolgray-200:50 rounded-5px bg-coolgray-400:50 cursor-pointer mr-2"
          @click="emits('complete')"
        />
        <div
          class="todo-cancel-btn i-mdi-cancel text-3xl text-zinc-500 cursor-pointer ml-2"
          @click="emits('cancel')"
        />
      </div>
      <div
        v-if="showDelete"
        class="todo-delete-btn i-mdi-delete-circle text-3xl text-zinc-500 ml-2"
        @click="emits('delete')"
      />
    </div>
  `
}

function TodoContent() {
  const piniaStore = useTodoStore()

  return vine`
    <div class="todo">
      <div class="todo-content px-20px mt-20px">
        <div class="title cursor-pointer">
          <p>Tasks</p>
        </div>
        <div
          v-for="d in piniaStore.todoList"
          :key="d.id"
          class="todo-item flex items-center justify-center p-15px rounded-10px bg-coolgray-300:30 cursor-pointer"
        >
          <div class="todo-item-content flex items-center justify-between">
            <div class="todo-item-text">
              <div class="text-lg">{{ d.title }}</div>
            </div>
            <ToDoAction
              @complete="piniaStore.completeTodo(d)"
              @cancel="piniaStore.cancelTodo(d)"
              :state="d.state"
            />
          </div>
        </div>
      </div>
      <div class="todo-content px-20px mt-20px">
        <div class="title cursor-pointer">
          <p>Handled</p>
        </div>
        <div
          v-for="d in piniaStore.handledList"
          :key="d.id"
          class="todo-item flex items-center justify-center p-15px rounded-10px bg-coolgray-200:50 cursor-pointer complete"
        >
          <div class="todo-item-content flex items-center justify-between">
            <div class="todo-item-text">
              <div class="text-lg">{{ d.title }}</div>
            </div>
            <ToDoAction @delete="piniaStore.deleteTodo(d)" :state="d.state" show-delete />
          </div>
        </div>
      </div>
    </div>
  `
}

function TodoAdd() {
  const emits = vineEmits(['addItem'])
  function addTodo() {
    emits('addItem')
  }

  return vine`
    <div
      @click="addTodo"
      class="todo-add-btn icon flex items-center justify-center ml-5px dark:bg-coolgray-100:20 px-10px rounded-10px ml-10px hover:dark:bg-coolgray-100:10 cursor-pointer"
    >
      <div class="i-mdi-add text-3xl" />
    </div>
  `
}

function TodoInput() {
  const piniaStore = useTodoStore()
  const todoContent = ref('')

  function onAddItem() {
    piniaStore.addTodo({
      id: Date.now(),
      title: todoContent.value,
      state: 'todo',
    })
    todoContent.value = ''
  }

  return vine`
    <input
      type="text"
      class="todo-input bg-coolgray-200:50 pl-5 hover:bg-coolgray-200:50"
      v-model="todoContent"
    />
    <TodoAdd @addItem="onAddItem()" />
  `
}

function TodoHeader() {
  return vine`
    <div class="header flex justify-between p-20px">
      <div class="title">TodoList</div>
      <div class="input flex items-center justify-end">
        <TodoInput />
      </div>
    </div>
  `
}

export function TodoList() {
  vineStyle.import('../styles/todo-list.scss')

  return vine`
    <div class="todo-container container xl flex items-center justify-center flex-col">
      <TodoHeader />
      <TodoContent />
    </div>
  `
}
