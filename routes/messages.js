const express = require('express');
const router = express.Router();
const supabase = require('../supabase/client');
const { v4: uuidv4 } = require('uuid');

/**
 * Add a message to a branch
 * POST /message
 * Body: { branchId, content, role, metadata, userId }
 */
router.post('/message', async (req, res) => {
  try {
    const { branchId, content, role = 'user', metadata = {}, userId } = req.body;

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

    // If branch doesn't exist, create it
    if (branchError || !branch) {
      const { data: newBranch, error: createError } = await supabase
        .from('branches')
        .insert({
          id: branchId,
          parent_id: null,
          created_at: new Date(),
          user_id: userId
        })
        .select()
        .single();

      if (createError) {
        return res.status(500).json({ error: true, message: 'Failed to create branch' });
      }
    }

    // Insert message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        id: uuidv4(),
        branch_id: branchId,
        content,
        role,
        metadata
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: true, message: 'Failed to add message', details: error });
    }

    return res.status(201).json({ success: true, message });

  } catch (error) {
    console.error('Add message error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

/**
 * Get full conversation for a branch
 * GET /conversation/:branchId
 */
router.get('/conversation/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    if (!branchId) {
      return res.status(400).json({ error: true, message: 'branchId is required' });
    }
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: true });
    if (error) {
      return res.status(500).json({ error: true, message: 'Failed to fetch conversation', details: error });
    }
    return res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error('Get conversation error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

/**
 * Create a new branch from an existing one (fork)
 * POST /fork
 * Body: { parentBranchId, messageId, userId }
 */
router.post('/fork', async (req, res) => {
  try {
    const { parentBranchId, messageId, userId } = req.body;
    if (!parentBranchId) {
      return res.status(400).json({ error: true, message: 'parentBranchId is required' });
    }
    if (!userId) {
      return res.status(400).json({ error: true, message: 'userId is required' });
    }
    // Create new branch
    const newBranchId = uuidv4();
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .insert({
        id: newBranchId,
        parent_id: parentBranchId,
        user_id: userId,
        fork_point_message_id: messageId || null
      })
      .select()
      .single();
    if (branchError) {
      return res.status(500).json({ error: true, message: 'Failed to create branch', details: branchError });
    }
    // Copy messages from parent branch up to messageId if provided
    let query = supabase
      .from('messages')
      .select('*')
      .eq('branch_id', parentBranchId)
      .order('created_at', { ascending: true });
    if (messageId) {
      // Get messages up to and including the specified message
      const { data: targetMessage } = await supabase
        .from('messages')
        .select('created_at')
        .eq('id', messageId)
        .single();
      if (targetMessage) {
        query = query.lte('created_at', targetMessage.created_at);
      }
    }
    const { data: messagesToCopy, error: messagesError } = await query;
    if (messagesError) {
      return res.status(500).json({ error: true, message: 'Failed to fetch messages to copy', details: messagesError });
    }
    // Insert copied messages into new branch
    if (messagesToCopy && messagesToCopy.length > 0) {
      const messagesToInsert = messagesToCopy.map(msg => ({
        id: uuidv4(),
        branch_id: newBranchId,
        content: msg.content,
        role: msg.role,
        metadata: msg.metadata,
        original_message_id: msg.id
      }));
      const { error: insertError } = await supabase
        .from('messages')
        .insert(messagesToInsert);
      if (insertError) {
        console.error('Error copying messages:', insertError);
      }
    }
    return res.status(201).json({ 
      success: true, 
      branch: {
        ...branch,
        messageCount: messagesToCopy?.length || 0
      }
    });
  } catch (error) {
    console.error('Fork branch error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

/**
 * Merge two branches into a new one
 * POST /merge
 * Body: { sourceBranchId, targetBranchId, userId }
 */
router.post('/merge', async (req, res) => {
  try {
    const { sourceBranchId, targetBranchId, userId } = req.body;
    if (!sourceBranchId || !targetBranchId) {
      return res.status(400).json({ error: true, message: 'sourceBranchId and targetBranchId are required' });
    }
    if (!userId) {
      return res.status(400).json({ error: true, message: 'userId is required' });
    }
    // Create new branch for the merge result
    const newBranchId = uuidv4();
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .insert({
        id: newBranchId,
        user_id: userId,
        is_merge: true,
        merge_source_ids: [sourceBranchId, targetBranchId]
      })
      .select()
      .single();
    if (branchError) {
      return res.status(500).json({ error: true, message: 'Failed to create merge branch', details: branchError });
    }
    // Get messages from both branches
    const { data: sourceMessages, error: sourceError } = await supabase
      .from('messages')
      .select('*')
      .eq('branch_id', sourceBranchId)
      .order('created_at', { ascending: true });
    const { data: targetMessages, error: targetError } = await supabase
      .from('messages')
      .select('*')
      .eq('branch_id', targetBranchId)
      .order('created_at', { ascending: true });
    if (sourceError || targetError) {
      return res.status(500).json({ error: true, message: 'Failed to fetch messages for merging' });
    }
    // Combine messages from both branches
    const allMessages = [...(sourceMessages || []), ...(targetMessages || [])];
    // Sort by creation time
    allMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    // Insert merged messages into new branch
    if (allMessages.length > 0) {
      const messagesToInsert = allMessages.map(msg => ({
        id: uuidv4(),
        branch_id: newBranchId,
        content: msg.content,
        role: msg.role,
        metadata: {
          ...msg.metadata,
          original_branch_id: msg.branch_id,
          original_message_id: msg.id
        }
      }));
      const { error: insertError } = await supabase
        .from('messages')
        .insert(messagesToInsert);
      if (insertError) {
        console.error('Error inserting merged messages:', insertError);
      }
    }
    return res.status(201).json({ 
      success: true, 
      branch: {
        ...branch,
        messageCount: allMessages.length
      }
    });
  } catch (error) {
    console.error('Merge branches error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

/**
 * List all branches for a user
 * GET /branches/:userId
 */
router.get('/branches/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: true, message: 'userId is required' });
    }
    const { data: branches, error } = await supabase
      .from('branches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      return res.status(500).json({ error: true, message: 'Failed to fetch branches', details: error });
    }
    const branchesWithCounts = await Promise.all(branches.map(async (branch) => {
      const { count, error: countError } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('branch_id', branch.id);
      return {
        ...branch,
        messageCount: countError ? 0 : count
      };
    }));
    return res.status(200).json({ success: true, branches: branchesWithCounts });
  } catch (error) {
    console.error('Get branches error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

/**
 * Pin a message
 * POST /pin
 * Body: { messageId, isPinned }
 */
router.post('/pin', async (req, res) => {
  try {
    const { messageId, isPinned = true } = req.body;
    if (!messageId) {
      return res.status(400).json({ error: true, message: 'messageId is required' });
    }
    const { data: message, error } = await supabase
      .from('messages')
      .update({ is_pinned: isPinned })
      .eq('id', messageId)
      .select()
      .single();
    if (error) {
      return res.status(500).json({ error: true, message: 'Failed to pin message', details: error });
    }
    return res.status(200).json({ success: true, message });
  } catch (error) {
    console.error('Pin message error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

/**
 * Bookmark a message for future fork
 * POST /bookmark
 * Body: { messageId, isBookmarked }
 */
router.post('/bookmark', async (req, res) => {
  try {
    const { messageId, isBookmarked = true } = req.body;
    if (!messageId) {
      return res.status(400).json({ error: true, message: 'messageId is required' });
    }
    const { data: message, error } = await supabase
      .from('messages')
      .update({ is_bookmarked: isBookmarked })
      .eq('id', messageId)
      .select()
      .single();
    if (error) {
      return res.status(500).json({ error: true, message: 'Failed to bookmark message', details: error });
    }
    return res.status(200).json({ success: true, message });
  } catch (error) {
    console.error('Bookmark message error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

/**
 * Generate AI insights for a branch (optional)
 * GET /insights/:branchId
 */
router.get('/insights/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    if (!branchId) {
      return res.status(400).json({ error: true, message: 'branchId is required' });
    }
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: true });
    if (error) {
      return res.status(500).json({ error: true, message: 'Failed to fetch conversation', details: error });
    }
    if (!messages || messages.length === 0) {
      return res.status(404).json({ error: true, message: 'No messages found for this branch' });
    }
    const openaiService = require('../services/openaiService');
    const formattedMessages = [
      {
        role: 'system',
        content: 'You are an AI assistant tasked with summarizing a conversation. Provide key insights, main topics discussed, and any action items or conclusions reached.'
      },
      {
        role: 'user',
        content: `Please summarize the following conversation:\n\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}`
      }
    ];
    const response = await openaiService.generateResponse(formattedMessages);
    if (!response.success) {
      return res.status(500).json({ error: true, message: 'Failed to generate insights' });
    }
    const { data: insight, error: insightError } = await supabase
      .from('insights')
      .upsert({
        branch_id: branchId,
        content: response.data.content,
        metadata: response.usage || {}
      })
      .select()
      .single();
    if (insightError) {
      console.error('Error saving insights:', insightError);
      return res.status(200).json({
        success: true,
        insights: response.data.content,
        error: 'Failed to save insights to database'
      });
    }
    return res.status(200).json({
      success: true,
      insights: insight
    });
  } catch (error) {
    console.error('Generate insights error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

module.exports = router;
