import React, { useState, useRef, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  List,
  ListItem,
  Paper,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import api from '../services/api';

const LibrarianChat = ({ open, onClose }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Ciao! Sono il tuo Bibliotecario Personale. Posso aiutarti a scegliere cosa leggere o consigliarti nuovi acquisti basandomi sulla tua libreria!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    const newHistory = [...messages, userMessage];

    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post('/chat', {
        // Inviamo solo la cronologia pertinente (escludiamo il messaggio iniziale di benvenuto se vogliamo, o lo includiamo. Qui lo includiamo per semplicità).
        history: newHistory.filter(m => m.role === 'user' || m.role === 'assistant').slice(-10) // Tieni gli ultimi 10 messaggi per contesto
      });

      setMessages([...newHistory, { role: 'assistant', content: response.data.reply }]);
    } catch (error) {
      console.error('Errore chat:', error);
      setMessages([...newHistory, { role: 'assistant', content: 'Scusa, i miei circuiti sono un po\' arrugginiti. Riprova più tardi.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          height: '75vh',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          bgcolor: 'background.paper'
        }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Header Drawer */}
        <Box sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #333'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartToyIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">Il Bibliotecario</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Chat Messages Area */}
        <List sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          {messages.map((msg, idx) => (
            <ListItem
              key={idx}
              sx={{
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                mb: 2,
                p: 0
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, gap: 1 }}>
                {msg.role === 'assistant' && <SmartToyIcon fontSize="small" color="primary" />}
                {msg.role === 'user' && <PersonIcon fontSize="small" color="secondary" />}
                <Typography variant="caption" color="text.secondary">
                  {msg.role === 'user' ? 'Tu' : 'Bibliotecario'}
                </Typography>
              </Box>
              <Paper
                elevation={1}
                sx={{
                  p: 1.5,
                  maxWidth: '85%',
                  bgcolor: msg.role === 'user' ? 'primary.dark' : '#2a2a2a',
                  color: 'white',
                  borderRadius: 2,
                  wordBreak: 'break-word'
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </Typography>
              </Paper>
            </ListItem>
          ))}
          {isLoading && (
            <ListItem sx={{ alignItems: 'flex-start', mb: 2, p: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, gap: 1 }}>
                <SmartToyIcon fontSize="small" color="primary" />
                <Typography variant="caption" color="text.secondary">Bibliotecario</Typography>
              </Box>
              <Paper elevation={1} sx={{ p: 1.5, bgcolor: '#2a2a2a', borderRadius: 2 }}>
                <CircularProgress size={20} color="inherit" />
              </Paper>
            </ListItem>
          )}
          <div ref={messagesEndRef} />
        </List>

        {/* Input Area */}
        <Box sx={{ p: 2, borderTop: '1px solid #333', display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Chiedimi un consiglio..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            size="small"
            multiline
            maxRows={3}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 4,
                bgcolor: '#121212'
              }
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            sx={{ alignSelf: 'flex-end', mb: 0.5 }}
          >
            <SendIcon />
          </IconButton>
        </Box>

      </Box>
    </Drawer>
  );
};

export default LibrarianChat;