import { PageHeader } from '../components/page-header.vine';
import {useTodoStore} from '../store/todoList'
import type {TodoItem} from '../store/todoList'

function ToDoCheckbox() {
  const state = vineProp<string>()
  const emits = vineEmits<{
    'complete':[]
  }>()
  function complete(){
    emits('complete')
  }

  return vine`
  <div v-if="state==='complete'" class="complete i-mdi-check text-3xl bg-#16a34a" />
  <div v-else-if="state==='cancel'" class="cancel i-mdi-close text-3xl bg-#dc2626" />
  <div @click="complete" v-else class="todo-checkbox dark:bg-coolgray-100:20 rounded-5px hover:dark:bg-coolgray-100:10 cursor-pointer" />
  `;
}

function TodoContent() {
const piniaStore  = useTodoStore()

  const todoList = piniaStore.getTodoList
  const completeList = piniaStore.getCompleteList

  function completeTodo(todoItem:TodoItem){
      piniaStore.completeTodo(todoItem)
  }

  return vine`
  <div class="todo">
    <div class="todo-content px-20px mt-20px ">
      <div class="title cursor-pointer">
        <p>待办事项</p>
      </div>
    <div class="todo-item flex items-center justify-center p-15px rounded-10px dark:bg-coolgray-100:20 cursor-pointer" v-for="d in todoList">
      <div class="todo-item-content flex items-center justify-between">
        <div class="todo-item-text">
          <div class="text-lg text-gray-100">{{d.title}}</div>
        </div>
        <ToDoCheckbox @complete="completeTodo(d)" :state="d.state"/>
      </div>
    </div>
    </div>
    <div class="todo-content px-20px mt-20px ">
      <div class="title cursor-pointer">
        <p>完成事项</p>
      </div>
      <div class="todo-item flex items-center justify-center p-15px rounded-10px dark:bg-coolgray-100:20 cursor-pointer complete" v-for="d in completeList">
      <div class="todo-item-content flex items-center justify-between">
        <div class="todo-item-text">
          <div class="text-lg text-gray-100">{{d.title}}</div>
        </div>
        <ToDoCheckbox :state="d.state"/>
      </div>
    </div>
    </div>
  </div>
  `;
}

function TodoAdd(){
  const title = vineProp<string>()
  const piniaStore  = useTodoStore()
  const emits = vineEmits(['clearTitle'])
  function addTodo(){
      if(title.value === '') return;
      piniaStore.addTodo({
        id:Date.now(),
        title:title.value,
        state: 'todo'
      })
      emits('clearTitle')
  }

  return vine`
    <div @click="addTodo" class="icon flex items-center justify-center ml-5px dark:bg-coolgray-100:20 px-10px rounded-10px ml-10px hover:dark:bg-coolgray-100:10 cursor-pointer">
      <div class="i-mdi-add text-3xl" />
    </div>
  `;
}

function TodoInput() {

  const emit = vineEmits<{'update:modelValue':[title:string]}>()
  const title = vineProp<string>()
  const value = ref(title.value)
  function emitChange(){
    emit('update:modelValue',value.value)
  }

  return vine`
    <input type="text" class="todo-input dark:bg-coolgray-100:20 pl-5 hover:dark:bg-coolgray-100:10" @input="emitChange" v-model="value" />
    <TodoAdd @clearTitle='value=""' :title="value"/>
  `;
}

function Header() {
  const title = ref('')
  function clearTitle(){
    title.value = ''
  }
  return vine`
    <div class="header flex justify-between p-20px">
      <div class="title">TodoList</div>
      <div class="input flex items-center justify-end">
      <TodoInput :title="title" @update:modelValue="title = $event"/>
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
