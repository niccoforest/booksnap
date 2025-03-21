// client/src/components/book/BookCarousel.js
import React, { useEffect, useState } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import BookCard from './BookCard';

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
    arrows: books.length > effectiveSlidesToShow,
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
        px: { xs: 1, sm: 1.5 },
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'stretch',
        height: 'auto'
      },
      '& .slick-list': {
        mx: { xs: -1, sm: -1.5 }
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
        bottom: -35
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
              onBookClick={() => onBookClick(book._id)}
            />
          </Box>
        ))}
      </Slider>
    </Box>
  );
};

export default BookCarousel;