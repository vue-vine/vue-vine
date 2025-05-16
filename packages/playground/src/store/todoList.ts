import { defineStore } from 'pinia'

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
