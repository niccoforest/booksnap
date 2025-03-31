import React, { useEffect, useState } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { Box, useTheme, useMediaQuery, IconButton, alpha } from '@mui/material';
import {
  ArrowBackIos as PrevIcon,
  ArrowForwardIos as NextIcon
} from '@mui/icons-material';
import BookCard from './BookCard'; // Assicurati che l'import sia corretto

// Componente freccia personalizzato per il carosello
const CustomArrow = ({ direction, onClick }) => {
  const theme = useTheme();

  return (
    <IconButton
      onClick={onClick}
      sx={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 10,
        color: theme.palette.text.secondary, // Usa un colore di testo per contrasto
        bgcolor: alpha(theme.palette.background.paper, 0.5), // Sfondo semi-trasparente
        width: 32,
        height: 32,
        [direction === 'prev' ? 'left' : 'right']: 5, // Sposta leggermente dentro
        '&:hover': {
          bgcolor: alpha(theme.palette.background.paper, 0.8),
        }
      }}
      aria-label={direction === 'prev' ? 'Previous slide' : 'Next slide'}
    >
      {direction === 'prev' ? <PrevIcon fontSize="small" /> : <NextIcon fontSize="small" />}
    </IconButton>
  );
};

const BookCarousel = ({
  books = [], // Array di oggetti libro o userBook
  onBookClick, // Callback quando una card viene cliccata (riceve bookId o userBookId)
  maxVisible = 6, // Numero massimo di libri da mostrare effettivamente
  autoplay = false,
  centerMode = true,
  cardVariant = 'preview' // Variante di BookCard da usare nel carosello
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isLaptop = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const [slidesToShow, setSlidesToShow] = useState(4); // Default per desktop

  // Determina il numero di slide da mostrare in base alla dimensione dello schermo
  useEffect(() => {
    if (isMobile) {
      setSlidesToShow(1); // O 2 se vuoi provare
    } else if (isTablet) {
      setSlidesToShow(3);
    } else if (isLaptop) {
      setSlidesToShow(3); // O 4
    } else {
      setSlidesToShow(4); // Desktop
    }
  }, [isMobile, isTablet, isLaptop]);

  // Se ci sono meno libri del numero di slide desiderato, mostra solo quelli disponibili
  // Questo valore viene usato per configurare correttamente 'infinite' e 'centerMode'
  const effectiveSlidesToShow = Math.min(slidesToShow, books.length);

  // Configura le impostazioni del carousel
  const settings = {
    dots: true,
    infinite: books.length > effectiveSlidesToShow, // Attiva loop solo se ci sono più libri di quelli visibili
    speed: 500,
    slidesToShow: effectiveSlidesToShow,
    slidesToScroll: 1,
    autoplay: autoplay,
    autoplaySpeed: 5000,
    centerMode: centerMode && books.length > effectiveSlidesToShow, // Attiva centerMode solo se necessario
    centerPadding: '30px', // Spazio per vedere le slide adiacenti in centerMode
    nextArrow: <CustomArrow direction="next" />,
    prevArrow: <CustomArrow direction="prev" />,
    responsive: [
      {
        breakpoint: 1280, // lg
        settings: {
          slidesToShow: Math.min(3, books.length),
          slidesToScroll: 1,
          infinite: books.length > Math.min(3, books.length),
          centerMode: centerMode && books.length > Math.min(3, books.length)
        }
      },
      {
        breakpoint: 960, // md
        settings: {
          slidesToShow: Math.min(2, books.length),
          slidesToScroll: 1,
          infinite: books.length > Math.min(2, books.length),
          centerMode: centerMode && books.length > Math.min(2, books.length)
        }
      },
      {
        breakpoint: 600, // sm
        settings: {
          slidesToShow: 1, // Mostra solo 1 su mobile
          slidesToScroll: 1,
          infinite: books.length > 1,
          centerMode: false, // Disattiva center mode su mobile di solito è meglio
          dots: books.length > 1 // Mostra dots solo se più di 1 libro
        }
      }
    ]
  };

  // Non renderizzare nulla se l'array books è vuoto o non fornito
  if (!books || books.length === 0) {
    return null;
  }

  // Gestione speciale per un solo libro (non usa Slider)
  if (books.length === 1) {
    const item = books[0];
    // Determina se è userBook o book semplice
    const isUserBookItem = !!(item && item.bookId);
    const bookIdToUse = isUserBookItem ? item._id : (item._id || item.googleBooksId);

    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', px: 2, py: 2 }}>
        <Box sx={{ width: '250px', maxWidth: '100%' }}>
          <BookCard
            book={isUserBookItem ? undefined : item}
            userBook={isUserBookItem ? item : undefined}
            variant={cardVariant}
            // rating={item.rating} // Passa solo se disponibile e gestito dalla variante
            onBookClick={() => bookIdToUse && onBookClick(bookIdToUse)}
          />
        </Box>
      </Box>
    );
  }

  // Renderizza il componente Slider se ci sono più libri
  return (
    <Box sx={{
      width: '100%',
      py: 2, // Padding verticale per dare spazio ai dots
      '& .slick-slide': {
        px: 1, // Spazio laterale tra le card (padding x)
        boxSizing: 'border-box',
      },
      '& .slick-list': {
        // Potrebbe non servire margine negativo se px è gestito bene
        // margin: '0 -8px',
      },
      '& .slick-track': {
        display: 'flex',
        alignItems: 'stretch', // Assicura che le card abbiano la stessa altezza visiva
      },
      '& .slick-slide > div': { // Div contenitore diretto della card
         height: '100%', // Fa sì che il div interno prenda tutta l'altezza
         display: 'flex', // Necessario per far funzionare l'altezza 100% sulla card
      },
      '& .slick-dots': {
        bottom: -20, // Sposta i punti leggermente più in basso
         '& li button:before': {
             fontSize: '10px', // Dimensione punti
             color: theme.palette.text.secondary, // Colore meno invadente
             opacity: 0.5
         },
         '& li.slick-active button:before': {
             color: theme.palette.primary.main, // Colore primario per attivo
             opacity: 1
         }
      },
      // Stili frecce gestiti da CustomArrow sx prop
    }}>
      <Slider {...settings}>
        {/* Mappa solo fino a maxVisible libri se specificato */}
        {books.slice(0, maxVisible).map((item, index) => {
          // Genera chiave unica robusta
          const uniqueKey = item._id || item.googleBooksId || `carousel-item-${index}-${Math.random().toString(36).substring(2, 11)}`;

          // Determina se è userBook o book semplice
          const isUserBookItem = !!(item && item.bookId);
          // Ottieni l'ID corretto da passare a onBookClick
          const bookIdToUse = isUserBookItem ? item._id : (item._id || item.googleBooksId);

          return (
            // Box wrapper per garantire altezza corretta all'interno dello slide
             <Box key={uniqueKey} sx={{ height: '100%', display: 'flex', width: '100%' }}>
                <BookCard
                    // Passa l'item alla prop corretta
                    book={isUserBookItem ? undefined : item}
                    userBook={isUserBookItem ? item : undefined}
                    variant={cardVariant} // Usa la variante specificata
                    // rating={item.rating} // Opzionale
                    onBookClick={() => bookIdToUse && onBookClick(bookIdToUse)} // Usa ID corretto
                    // Aggiungi altre props necessarie per la variante specifica se necessario
                />
             </Box>
          );
        })}
      </Slider>
    </Box>
  );
};

export default BookCarousel;