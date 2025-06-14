const express = require('express');
const router = express.Router();
const openaiService = require('../services/openaiService');
const geminiService = require('../services/geminiService');
const supabase = require('../supabase/client');

/**
 * Route to handle LLM requests
 * POST /llm
 * Body: { messages: [], llmType: 'openai' | 'gemini', branchId: string }
 */
router.post('/llm', async (req, res) => {
  try {
    const { messages, llmType, branchId } = req.body;
    
    // Validate request body
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: true, message: 'Messages array is required' });
    }
    
    if (!llmType || (llmType !== 'openai' && llmType !== 'gemini')) {
      return res.status(400).json({ error: true, message: 'Valid llmType (openai or gemini) is required' });
    }
    
    if (!branchId) {
      return res.status(400).json({ error: true, message: 'branchId is required' });
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
    
    // Generate response based on llmType
    let response;
    if (llmType === 'openai') {
      response = await openaiService.generateResponse(messages);
    } else {
      response = await geminiService.generateResponse(messages);
    }
    
    if (!response.success) {
      return res.status(500).json({ error: true, message: response.error });
    }
    
    // Save the LLM response to the database
    const { data: savedMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        branch_id: branchId,
        role: 'assistant',
        content: response.data.content,
        llm_type: llmType,
        metadata: response.usage || {}
      })
      .select()
      .single();
      
    if (messageError) {
      console.error('Error saving message:', messageError);
      // Still return the LLM response even if saving to DB fails
    }
    
    // Return the response
    return res.status(200).json({
      success: true,
      message: response.data,
      savedMessageId: savedMessage?.id
    });
    
  } catch (error) {
    console.error('LLM route error:', error);
    return res.status(500).json({ error: true, message: error.message || 'Internal server error' });
  }
});

module.exports = router;