import { PageHeader } from '../components/page-header.vine';
import { useTodoStore } from '../store/todoList'

function ToDoAction() {
  const state = vineProp<string>()
  const showDelete = vineProp.withDefault(false)
  const emits = vineEmits(['complete', 'delete', 'cancel'])

  return vine`
    <div class="flex items-center">
      <div
        v-if="state === 'complete'"
        class="complete i-mdi-check-circle text-3xl cursor-default text-#7eff84"
      />
      <div
        v-else-if="state === 'cancel'"
        class="cancel i-mdi-close text-3xl cursor-default text-#dc2626"
      />
      <div v-else class="flex items-center">
        <div
          class="todo-checkbox dark:bg-coolgray-100:20 rounded-5px hover:dark:bg-coolgray-100:10 cursor-pointer mr-2"
          @click="emits('complete')"
        />
        <div
          class="i-mdi-cancel text-3xl text-#898989 cursor-pointer ml-2"
          @click="emits('cancel')"
        />
      </div>
      <div
        v-if="showDelete"
        class="complete i-mdi-delete-circle text-3xl text-#89898b ml-2"
        @click="emits('delete')"
      />
    </div>
  `;
}

function TodoContent() {
  const piniaStore = useTodoStore()

  return vine`
    <div class="todo">
      <div class="todo-content px-20px mt-20px ">
        <div class="title cursor-pointer">
          <p>Tasks</p>
        </div>
      <div v-for="d in piniaStore.todoList" :key="d.id" class="todo-item flex items-center justify-center p-15px rounded-10px dark:bg-coolgray-100:20 cursor-pointer">
        <div class="todo-item-content flex items-center justify-between">
          <div class="todo-item-text">
            <div class="text-lg text-gray-100">{{ d.title }}</div>
          </div>
          <ToDoAction
            @complete="piniaStore.completeTodo(d)"
            @cancel="piniaStore.cancelTodo(d)"
            :state="d.state"
          />
        </div>
      </div>
      </div>
      <div class="todo-content px-20px mt-20px ">
        <div class="title cursor-pointer">
          <p>Handled</p>
        </div>
        <div v-for="d in piniaStore.handledList" :key="d.id" class="todo-item flex items-center justify-center p-15px rounded-10px dark:bg-coolgray-100:20 cursor-pointer complete">
        <div class="todo-item-content flex items-center justify-between">
          <div class="todo-item-text">
            <div class="text-lg text-gray-100">{{ d.title }}</div>
          </div>
          <ToDoAction
            @delete="piniaStore.deleteTodo(d)"
            :state="d.state"
            show-delete
          />
        </div>
      </div>
      </div>
    </div>
  `;
}

function TodoAdd(){
  const emits = vineEmits(['addItem'])
  function addTodo(){
    emits('addItem')
  }

  return vine`
    <div @click="addTodo" class="icon flex items-center justify-center ml-5px dark:bg-coolgray-100:20 px-10px rounded-10px ml-10px hover:dark:bg-coolgray-100:10 cursor-pointer">
      <div class="i-mdi-add text-3xl" />
    </div>
  `;
}

function TodoInput() {
  const piniaStore = useTodoStore()
  const todoContent = ref('')

  function onAddItem() {
    piniaStore.addTodo({
      id: Date.now(),
      title: todoContent.value,
      state: 'todo'
    })
    todoContent.value = ''
  }

  return vine`
    <input type="text" class="todo-input dark:bg-coolgray-100:20 pl-5 hover:dark:bg-coolgray-100:10" v-model="todoContent" />
    <TodoAdd @addItem="onAddItem()" />
  `;
}

function Header() {
  return vine`
    <div class="header flex justify-between p-20px">
      <div class="title">TodoList</div>
      <div class="input flex items-center justify-end">
      <TodoInput />
      </div>
    </div>
  `;
}

export default function TodoList() {
  vineStyle.import('~/styles/todo-list.scss');

  return vine`
    <PageHeader />
    <div class="todo-container container xl flex items-center justify-center flex-col	">
      <Header />
      <TodoContent />
    </div>
  `;
}
