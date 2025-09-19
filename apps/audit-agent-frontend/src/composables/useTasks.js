import { ref, onMounted } from "vue";
import { fetchTasks, addTaskToFirebase, updateTaskInFirebase } from "@/services/firebaseService";

export function useTasks() {
  const tasks = ref([]);

  async function loadTasks() {
    tasks.value = await fetchTasks();
  }

  async function addTask() {
    const newTask = {
      title: "New Task",
      details: "",
      completed: false,
      reflection: "",
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
    };
    const savedTask = await addTaskToFirebase(newTask);
    tasks.value.unshift(savedTask);
  }

  async function toggleComplete(task) {
    task.completed = !task.completed;
    await updateTaskInFirebase(task);
  }

  onMounted(loadTasks);

  return { tasks, addTask, toggleComplete, loadTasks };
}