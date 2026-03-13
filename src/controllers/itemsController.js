const { v4: uuidv4 } = require('uuid');

const items = new Map();

const itemsController = {
  getAllItems: (req, res) => {
    const allItems = Array.from(items.values());
    res.json(allItems);
  },

  getItemById: (req, res) => {
    const { id } = req.params;
    const item = items.get(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  },

  createItem: (req, res) => {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const now = new Date().toISOString();
    const item = {
      id: uuidv4(),
      name,
      description: description || '',
      createdAt: now,
      updatedAt: now
    };
    items.set(item.id, item);
    res.status(201).json(item);
  },

  updateItem: (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const item = items.get(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    const now = new Date().toISOString();
    const updatedItem = {
      ...item,
      ...(name && { name }),
      ...(description !== undefined && { description }),
      updatedAt: now
    };
    items.set(id, updatedItem);
    res.json(updatedItem);
  },

  deleteItem: (req, res) => {
    const { id } = req.params;
    const item = items.get(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    items.delete(id);
    res.status(204).send();
  }
};

module.exports = itemsController;
