const express = require('express');
const router = express.Router();
const supabase = require('../supabase/client');
const { v4: uuidv4 } = require('uuid');

/**
 * Add a memory item (quote, link, insight)
 * POST /memory
 * Body: { branchId, type, content, source, userId }
 */
router.post('/memory', async (req, res) => {
  try {
    const { branchId, type, content, source, userId, metadata = {} } = req.body;
    
    // Validate request
    if (!branchId) {
      return res.status(400).json({ error: true, message: 'branchId is required' });
    }
    
    if (!type) {
      return res.status(400).json({ error: true, message: 'type is required' });
    }
    
    if (!content) {
      return res.status(400).json({ error: true, message: 'content is required' });
    }
    
    if (!userId) {
      return res.status(400).json({ error: true, message: 'userId is required' });
    }
    
    // Validate memory type
    const validTypes = ['quote', 'link', 'insight', 'reference', 'note'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: true, 
        message: `Invalid memory type. Must be one of: ${validTypes.join(', ')}` 
      });
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
    
    // Insert memory item
    const { data: memory, error } = await supabase
      .from('memory')
      .insert({
        id: uuidv4(),
        branch_id: branchId,
        type,
        content,
        source: source || null,
        user_id: userId,
        metadata
      })
      .select()
      .single();
      
    if (error) {
      return res.status(500).json({ error: true, message: 'Failed to add memory item', details: error });
    }
    
    return res.status(201).json({ success: true, memory });
    
  } catch (error) {
    console.error('Add memory error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

/**
 * Get all memory items for a branch
 * GET /memory/:branchId
 */
router.get('/memory/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    
    // Validate request
    if (!branchId) {
      return res.status(400).json({ error: true, message: 'branchId is required' });
    }
    
    // Get memory items for branch
    const { data: memoryItems, error } = await supabase
      .from('memory')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false });
      
    if (error) {
      return res.status(500).json({ error: true, message: 'Failed to fetch memory items', details: error });
    }
    
    return res.status(200).json({ success: true, memoryItems });
    
  } catch (error) {
    console.error('Get memory items error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

/**
 * Update a memory item
 * PATCH /memory/:id
 * Body: { content, source, metadata }
 */
router.patch('/memory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, source, metadata, type } = req.body;
    
    // Validate request
    if (!id) {
      return res.status(400).json({ error: true, message: 'Memory item id is required' });
    }
    
    // Build update object
    const updateData = {};
    
    if (content !== undefined) {
      updateData.content = content;
    }
    
    if (source !== undefined) {
      updateData.source = source;
    }
    
    if (metadata !== undefined) {
      updateData.metadata = metadata;
    }
    
    if (type !== undefined) {
      // Validate memory type if provided
      const validTypes = ['quote', 'link', 'insight', 'reference', 'note'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ 
          error: true, 
          message: `Invalid memory type. Must be one of: ${validTypes.join(', ')}` 
        });
      }
      updateData.type = type;
    }
    
    // Update memory item
    const { data: memory, error } = await supabase
      .from('memory')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      return res.status(500).json({ error: true, message: 'Failed to update memory item', details: error });
    }
    
    if (!memory) {
      return res.status(404).json({ error: true, message: 'Memory item not found' });
    }
    
    return res.status(200).json({ success: true, memory });
    
  } catch (error) {
    console.error('Update memory error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

/**
 * Delete a memory item
 * DELETE /memory/:id
 */
router.delete('/memory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate request
    if (!id) {
      return res.status(400).json({ error: true, message: 'Memory item id is required' });
    }
    
    // Delete memory item
    const { data, error } = await supabase
      .from('memory')
      .delete()
      .eq('id', id);
      
    if (error) {
      return res.status(500).json({ error: true, message: 'Failed to delete memory item', details: error });
    }
    
    return res.status(200).json({ success: true, message: 'Memory item deleted successfully' });
    
  } catch (error) {
    console.error('Delete memory error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

/**
 * Search memory items across all branches
 * GET /memory/search/:query
 */
router.get('/memory/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { userId } = req.query;
    
    // Validate request
    if (!query) {
      return res.status(400).json({ error: true, message: 'Search query is required' });
    }
    
    // Build search query
    let searchQuery = supabase
      .from('memory')
      .select('*')
      .or(`content.ilike.%${query}%,source.ilike.%${query}%`);
      
    // Filter by user if provided
    if (userId) {
      searchQuery = searchQuery.eq('user_id', userId);
    }
    
    // Execute search
    const { data: memoryItems, error } = await searchQuery
      .order('created_at', { ascending: false });
      
    if (error) {
      return res.status(500).json({ error: true, message: 'Failed to search memory items', details: error });
    }
    
    return res.status(200).json({ success: true, memoryItems });
    
  } catch (error) {
    console.error('Search memory error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

module.exports = router;