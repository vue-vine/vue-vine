import { defineStore } from 'pinia'

export interface TodoItem {
  id: number
  title: string
  state: 'todo' | 'complete' | 'cancel'
}
export interface TodoState {
  todoList: TodoItem[]
  completeList: TodoItem[]
}

export const useTodoStore = defineStore('todoList', {
  state: (): TodoState => {
    return {
      todoList: JSON.parse(((localStorage.getItem('todoList')!))) as TodoItem[] || [],
      completeList: JSON.parse(((localStorage.getItem('completeList')!))) as TodoItem[] || [],
    }
  },
  actions: {
    addTodo(todoData: TodoItem) {
      this.todoList.push(todoData)
      localStorage.setItem('todoList', JSON.stringify(this.todoList))
    },
    completeTodo(todoData: TodoItem) {
      this.completeList.push(todoData)
      const index = this.todoList.findIndex(v => v.id === todoData.id)
      this.todoList.splice(index, 1)
      todoData.state = 'complete'
      localStorage.setItem('completeList', JSON.stringify(this.completeList))
      localStorage.setItem('todoList', JSON.stringify(this.todoList))
    },
  },
  getters: {
    getTodoList(state) {
      return state.todoList
    },
    getCompleteList(state) {
      return state.completeList
    },
  },
})
