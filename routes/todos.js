const express = require('express');
const router = express.Router();
const supabase = require('../supabase/client');
const { v4: uuidv4 } = require('uuid');

/**
 * Add a to-do item to a branch
 * POST /todo
 * Body: { branchId, content, userId, priority }
 */
router.post('/todo', async (req, res) => {
  try {
    const { branchId, content, userId, priority = 'medium' } = req.body;
    
    // Validate request
    if (!branchId) {
      return res.status(400).json({ error: true, message: 'branchId is required' });
    }
    
    if (!content) {
      return res.status(400).json({ error: true, message: 'content is required' });
    }
    
    if (!userId) {
      return res.status(400).json({ error: true, message: 'userId is required' });
    }
    
    // Check if branch exists
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('id')
      .eq('id', branchId)
      .single();
      
    if (branchError || !branch) {
      return res.status(404).json({ error: true, message: 'Branch not found' });
    }
    
    // Insert todo
    const { data: todo, error } = await supabase
      .from('todos')
      .insert({
        id: uuidv4(),
        branch_id: branchId,
        content,
        user_id: userId,
        priority,
        is_completed: false
      })
      .select()
      .single();
      
    if (error) {
      return res.status(500).json({ error: true, message: 'Failed to add todo', details: error });
    }
    
    return res.status(201).json({ success: true, todo });
    
  } catch (error) {
    console.error('Add todo error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

/**
 * List all todos in a branch
 * GET /todo/:branchId
 */
router.get('/todo/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    
    // Validate request
    if (!branchId) {
      return res.status(400).json({ error: true, message: 'branchId is required' });
    }
    
    // Get todos for branch
    const { data: todos, error } = await supabase
      .from('todos')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false });
      
    if (error) {
      return res.status(500).json({ error: true, message: 'Failed to fetch todos', details: error });
    }
    
    return res.status(200).json({ success: true, todos });
    
  } catch (error) {
    console.error('Get todos error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

/**
 * Toggle todo complete/incomplete
 * PATCH /todo/:id
 * Body: { isCompleted }
 */
router.patch('/todo/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isCompleted } = req.body;
    
    // Validate request
    if (!id) {
      return res.status(400).json({ error: true, message: 'Todo id is required' });
    }
    
    if (isCompleted === undefined) {
      return res.status(400).json({ error: true, message: 'isCompleted is required' });
    }
    
    // Update todo
    const { data: todo, error } = await supabase
      .from('todos')
      .update({ 
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date() : null
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      return res.status(500).json({ error: true, message: 'Failed to update todo', details: error });
    }
    
    if (!todo) {
      return res.status(404).json({ error: true, message: 'Todo not found' });
    }
    
    return res.status(200).json({ success: true, todo });
    
  } catch (error) {
    console.error('Update todo error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

/**
 * Remove a todo
 * DELETE /todo/:id
 */
router.delete('/todo/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate request
    if (!id) {
      return res.status(400).json({ error: true, message: 'Todo id is required' });
    }
    
    // Delete todo
    const { data, error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);
      
    if (error) {
      return res.status(500).json({ error: true, message: 'Failed to delete todo', details: error });
    }
    
    return res.status(200).json({ success: true, message: 'Todo deleted successfully' });
    
  } catch (error) {
    console.error('Delete todo error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

module.exports = router;