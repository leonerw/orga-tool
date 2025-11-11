import Todo from '../models/todo.model.js';

export const getTodos = async (req, res) => {
    try {
        const todos = await Todo.find().sort({ createdAt: -1 });
        res.json(todos);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching todos', error });
    }
};

export const createTodo = async (req, res) => {
    try {
        const newTodo = Todo.create(req.body);
        res.status(201).json(newTodo);
    } catch (error) {
        res.status(400).json({ message: 'Error creating todo', error });
    }
};

export const updateTodo = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedTodo = await Todo.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedTodo) {
            return res.status(404).json({ message: 'Todo not found' });
        }
        res.json(updatedTodo);
    } catch (error) {
        res.status(400).json({ message: 'Error updating todo', error });
    }
};

export const deleteTodo = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedTodo = await Todo.findByIdAndDelete(id);
        if (!deletedTodo) {
            return res.status(404).json({ message: 'Todo not found' });
        }
        res.json({ message: 'Todo deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error deleting todo', error });
    }
};