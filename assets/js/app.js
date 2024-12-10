function collectData() {
    const description = document.getElementById('description').value
    const date = document.getElementById('date').value
    const time = document.getElementById('time').value
    const index = getNumberOfTasksInLocalStorage()
    return {
        index,
        description,
        date,
        time,
    };
}

function generateHTML(data) {
    const newHTML = `
        <div class="task" id="task-${data.index}">
            <div class="xIcon" ">
                <i class="bi bi-x delete-icon" onclick="remove(${data.index})"></i>
            </div>
        <br>
            <div class="task-description">${data.description}</div>
            <div class="task-date-time" id="dateTime">
            ${data.date} 
            <br>
            ${data.time}
            </div>
        </div>
    `;

    return newHTML
}
function remove(index) {
    const tasksJSON = localStorage.getItem("tasks");
    const tasks = JSON.parse(tasksJSON);
    tasks.splice(index, 1);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    const taskElement = document.getElementById(`task-${index}`);
    taskElement.remove();
  }
  


function saveTaskToStorage(taskObject) {
    const currentTasksInStorageJSON = localStorage.getItem('tasks')
    const currentTasksInStorage = currentTasksInStorageJSON ? JSON.parse(currentTasksInStorageJSON) : [];
    currentTasksInStorage.push(taskObject)
    localStorage.setItem('tasks', JSON.stringify(currentTasksInStorage))
}

function loadFromLocalStorage() {
    const tasksContainer = document.getElementById('tasks');
    tasksContainer.innerHTML = ""; 
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const newHTML = generateHTML(task);
        renderHTML(newHTML);
    }
}

function deleteTask(data,index) {
    
    const tasksForm = document.getElementById('tasksForm')
    tasksForm.reset()
    alert(`will delete item #${index} from local storage`)

    const descriptionInput = document.getElementById('description')
    descriptionInput.focus()
}

function renderHTML(newHTML) {
    const tasksContainer = document.getElementById('tasks')
    tasksContainer.innerHTML += newHTML
}

function clearForm() {
    const tasksForm = document.getElementById('tasksForm')
    tasksForm.reset()

    const descriptionInput = document.getElementById('description')
    descriptionInput.focus()
}

function initStorage() {
    const currentTasksInStorageJSON = localStorage.getItem('tasks')
    if(!currentTasksInStorageJSON) {
        localStorage.setItem('tasks', JSON.stringify([]))
    }
    
}

function getNumberOfTasksInLocalStorage() {
    return JSON.parse(localStorage.getItem('tasks')).length
}

function checkAndRemoveExpiredTasks() {
    const tasksJSON = localStorage.getItem('tasks')
    if (tasksJSON) {
        let tasks = JSON.parse(tasksJSON)
        const currentTime = new Date()

        const validTasks = tasks.filter((task) => {
            const taskTime = new Date(`${task.date} ${task.time}`);
            return taskTime > currentTime 
        })

        if (validTasks.length !== tasks.length) {
            localStorage.setItem('tasks', JSON.stringify(validTasks))
            renderTasks()
        }
    }
}

function renderTasks() {
    const tasksContainer = document.getElementById('tasks')
    tasksContainer.innerHTML = ''

    const tasksJSON = localStorage.getItem('tasks')
    if (tasksJSON) {
        const tasks = JSON.parse(tasksJSON)
        for (const task of tasks) {
            const newHTML = generateHTML(task)
            renderHTML(newHTML)
        }
    }
}

function addTask(event) {
    event.preventDefault();
    const data = collectData();
    
    const newHTML = generateHTML(data);
    renderHTML(newHTML);
    saveTaskToStorage(data);
    clearForm()
  
}

initStorage();
loadFromLocalStorage();
checkAndRemoveExpiredTasks() 
    
