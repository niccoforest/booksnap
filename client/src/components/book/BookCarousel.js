// client/src/components/book/BookCarousel.js
import React, { useEffect, useState } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { Box, useTheme, useMediaQuery, IconButton  } from '@mui/material';
import { 
  ArrowBackIos as PrevIcon, 
  ArrowForwardIos as NextIcon 
} from '@mui/icons-material';
import BookCard from './BookCard';


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
          backgroundColor: 'rgba(93, 95, 239, 0.1)', // Colore primario con opacità
          width: 40,
          height: 40,
          [direction === 'prev' ? 'left' : 'right']: 0,
          '&:hover': {
            backgroundColor: 'rgba(93, 95, 239, 0.2)',
          }
        }}
      >
        {direction === 'prev' ? <PrevIcon fontSize="small" /> : <NextIcon fontSize="small" />}
      </IconButton>
    );
  };

const BookCarousel = ({ 
  books = [], 
  onBookClick,
  maxVisible = 6, // Numero massimo di libri da mostrare
  autoplay = false,
  centerMode = true
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isLaptop = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const [slidesToShow, setSlidesToShow] = useState(3);

  // Determina il numero di slide da mostrare in base alla dimensione dello schermo
  useEffect(() => {
    if (isMobile) {
      setSlidesToShow(1);
    } else if (isTablet) {
      setSlidesToShow(2);
    } else if (isLaptop) {
      setSlidesToShow(3);
    } else {
      setSlidesToShow(4); // Desktop
    }
  }, [isMobile, isTablet, isLaptop]);

  // Se ci sono meno libri del numero di slide da mostrare, mostra tutti i libri
  const effectiveSlidesToShow = Math.min(slidesToShow, books.length);

  // Configura le impostazioni del carousel
  const settings = {
    dots: true,
    infinite: books.length > effectiveSlidesToShow,
    speed: 500,
    slidesToShow: effectiveSlidesToShow,
    slidesToScroll: 1,
    autoplay: autoplay,
    autoplaySpeed: 5000,
    centerMode: centerMode && books.length > effectiveSlidesToShow,
    centerPadding: '30px',
    nextArrow: <CustomArrow direction="next" />,
    prevArrow: <CustomArrow direction="prev" />,
    responsive: [
      {
        breakpoint: 1280, // xl
        settings: {
          slidesToShow: Math.min(3, books.length),
          slidesToScroll: 1,
          centerMode: centerMode && books.length > 3
        }
      },
      {
        breakpoint: 960, // md
        settings: {
          slidesToShow: Math.min(2, books.length),
          slidesToScroll: 1,
          centerMode: centerMode && books.length > 2
        }
      },
      {
        breakpoint: 600, // sm
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          centerMode: centerMode && books.length > 1
        }
      }
    ]
  };

  // Non renderizzare il carousel se non ci sono libri
  if (!books.length) {
    return null;
  }

  // Se c'è solo un libro, non mostrare il carousel
  if (books.length === 1) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', px: 2 }}>
        <Box sx={{ width: '250px', maxWidth: '100%' }}>
          <BookCard 
            userBook={books[0]}
            variant="preview"
            rating={book[0].rating}
            onBookClick={() => onBookClick(books[0]._id)}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%',
      '& .slick-slide': { 
       padding: '0 10px', // Spaziatura tra slide
        boxSizing: 'border-box'
      },
      '& .slick-list': {
        margin: '0 -20px', // Correzione spaziatura
        padding: '0 20px'  // Padding per frecce
      },
      '& .slick-track': {
        display: 'flex',
        alignItems: 'stretch',
        '& .slick-slide > div': {
          height: '100%',
          display: 'flex'
        }
      },
      '& .slick-dots': {
        bottom: -30,
        '& li button:before': {
          color: theme.palette.primary.main,
          opacity: 0.3
        },
        '& li.slick-active button:before': {
          color: theme.palette.primary.main,
          opacity: 1
        }
      },
      '& .slick-prev, & .slick-next': {
        zIndex: 1,
        '&:before': {
          fontSize: '24px',
          color: theme.palette.text.primary
        }
      },
      '& .slick-prev': {
        left: -5,
        [theme.breakpoints.up('sm')]: {
          left: -15
        }
      },
      '& .slick-next': {
        right: -5,
        [theme.breakpoints.up('sm')]: {
          right: -15
        }
      }
    }}>
      <Slider {...settings}>
        {books.slice(0, maxVisible).map((book) => (
          <Box key={book._id} sx={{ height: '100%', px: 1 }}>
            <BookCard 
              userBook={book}
              variant="preview"
              rating={book.rating}
              onBookClick={() => onBookClick(book._id)}
            />
          </Box>
        ))}
      </Slider>
    </Box>
  );
};

export default BookCarousel;