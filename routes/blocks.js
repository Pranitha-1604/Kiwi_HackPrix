const express = require('express');
const router = express.Router();
const supabase = require('../supabase/client');
const { v4: uuidv4 } = require('uuid');

/**
 * Add a block (text/code/image/heading)
 * POST /block
 * Body: { branchId, type, content, metadata, userId }
 */
router.post('/block', async (req, res) => {
  try {
    const { branchId, type, content, metadata = {}, userId } = req.body;
    
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
    
    // Validate block type
    const validTypes = ['text', 'code', 'image', 'heading', 'list', 'quote', 'divider'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: true, 
        message: `Invalid block type. Must be one of: ${validTypes.join(', ')}` 
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
    
    // Insert block
    const { data: block, error } = await supabase
      .from('blocks')
      .insert({
        id: uuidv4(),
        branch_id: branchId,
        type,
        content,
        metadata,
        user_id: userId,
        position: metadata.position || null // Optional position for ordering
      })
      .select()
      .single();
      
    if (error) {
      return res.status(500).json({ error: true, message: 'Failed to add block', details: error });
    }
    
    return res.status(201).json({ success: true, block });
    
  } catch (error) {
    console.error('Add block error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

/**
 * Get all blocks for a branch
 * GET /block/:branchId
 */
router.get('/block/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    
    // Validate request
    if (!branchId) {
      return res.status(400).json({ error: true, message: 'branchId is required' });
    }
    
    // Get blocks for branch
    const { data: blocks, error } = await supabase
      .from('blocks')
      .select('*')
      .eq('branch_id', branchId)
      .order('position', { ascending: true, nullsLast: true })
      .order('created_at', { ascending: true });
      
    if (error) {
      return res.status(500).json({ error: true, message: 'Failed to fetch blocks', details: error });
    }
    
    return res.status(200).json({ success: true, blocks });
    
  } catch (error) {
    console.error('Get blocks error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

/**
 * Update a block
 * PATCH /block/:id
 * Body: { content, metadata }
 */
router.patch('/block/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, metadata, type } = req.body;
    
    // Validate request
    if (!id) {
      return res.status(400).json({ error: true, message: 'Block id is required' });
    }
    
    // Build update object
    const updateData = {};
    
    if (content !== undefined) {
      updateData.content = content;
    }
    
    if (metadata !== undefined) {
      updateData.metadata = metadata;
    }
    
    if (type !== undefined) {
      // Validate block type if provided
      const validTypes = ['text', 'code', 'image', 'heading', 'list', 'quote', 'divider'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ 
          error: true, 
          message: `Invalid block type. Must be one of: ${validTypes.join(', ')}` 
        });
      }
      updateData.type = type;
    }
    
    // Update block
    const { data: block, error } = await supabase
      .from('blocks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      return res.status(500).json({ error: true, message: 'Failed to update block', details: error });
    }
    
    if (!block) {
      return res.status(404).json({ error: true, message: 'Block not found' });
    }
    
    return res.status(200).json({ success: true, block });
    
  } catch (error) {
    console.error('Update block error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

/**
 * Delete a block
 * DELETE /block/:id
 */
router.delete('/block/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate request
    if (!id) {
      return res.status(400).json({ error: true, message: 'Block id is required' });
    }
    
    // Delete block
    const { data, error } = await supabase
      .from('blocks')
      .delete()
      .eq('id', id);
      
    if (error) {
      return res.status(500).json({ error: true, message: 'Failed to delete block', details: error });
    }
    
    return res.status(200).json({ success: true, message: 'Block deleted successfully' });
    
  } catch (error) {
    console.error('Delete block error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

/**
 * Reorder blocks
 * PATCH /block/reorder
 * Body: { blockIds }
 */
router.patch('/block/reorder', async (req, res) => {
  try {
    const { blockIds } = req.body;
    
    // Validate request
    if (!blockIds || !Array.isArray(blockIds) || blockIds.length === 0) {
      return res.status(400).json({ error: true, message: 'blockIds array is required' });
    }
    
    // Update positions for each block
    const updates = blockIds.map((id, index) => {
      return supabase
        .from('blocks')
        .update({ position: index })
        .eq('id', id);
    });
    
    // Execute all updates
    await Promise.all(updates);
    
    return res.status(200).json({ success: true, message: 'Blocks reordered successfully' });
    
  } catch (error) {
    console.error('Reorder blocks error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

module.exports = router;