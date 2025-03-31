// components/common/FilterBar.js
import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  IconButton, 
  Menu, 
  MenuItem, 
  Tooltip, 
  Divider,
  Typography,
  useTheme,
  alpha
} from '@mui/material';
import { 
  Sort as SortIcon,
  FilterList as FilterIcon,
  KeyboardArrowDown as ArrowDownIcon
} from '@mui/icons-material';

const FilterBar = ({
  sortOptions,
  sortBy,
  sortOrder,
  onSortChange,
  filterOptions = [],
  selectedFilters = {},
  onFilterChange,
  extraActions
}) => {
  const theme = useTheme();
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
  
  // Gestione menu ordinamento
  const handleSortMenuOpen = (event) => {
    setSortMenuAnchor(event.currentTarget);
  };
  
  const handleSortMenuClose = () => {
    setSortMenuAnchor(null);
  };
  
  const handleSortChange = (option) => {
    if (sortBy === option.value) {
      // Se è già selezionato, cambia direzione
      onSortChange(option.value, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Altrimenti, imposta la nuova opzione
      onSortChange(option.value, 'desc');
    }
    handleSortMenuClose();
  };
  
  // Gestione menu filtri
  const handleFilterMenuOpen = (event) => {
    setFilterMenuAnchor(event.currentTarget);
  };
  
  const handleFilterMenuClose = () => {
    setFilterMenuAnchor(null);
  };
  
  const handleFilterChange = (filterKey, value) => {
    onFilterChange(filterKey, value);
  };
  
  // Calcola quanti filtri sono attivi
  const activeFiltersCount = Object.keys(selectedFilters).length;
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      {/* Filtri */}
      {filterOptions.length > 0 && (
        <>
          <Button
            startIcon={<FilterIcon />}
            endIcon={<ArrowDownIcon />}
            onClick={handleFilterMenuOpen}
            color="inherit"
            sx={{ 
              mr: 1,
              ...(activeFiltersCount > 0 && {
                color: theme.palette.primary.main,
                bgcolor: alpha(theme.palette.primary.main, 0.1)
              })
            }}
          >
            Filtri
            {activeFiltersCount > 0 && (
              <Box
                sx={{
                  ml: 1,
                  bgcolor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem'
                }}
              >
                {activeFiltersCount}
              </Box>
            )}
          </Button>
          <Menu
            anchorEl={filterMenuAnchor}
            open={Boolean(filterMenuAnchor)}
            onClose={handleFilterMenuClose}
          >
            {filterOptions.map((filterGroup) => (
              <React.Fragment key={filterGroup.key}>
                <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
                  {filterGroup.label}
                </Typography>
                {filterGroup.options.map((option) => (
                  <MenuItem
                    key={option.value}
                    selected={selectedFilters[filterGroup.key] === option.value}
                    onClick={() => handleFilterChange(filterGroup.key, option.value)}
                  >
                    {option.label}
                  </MenuItem>
                ))}
                <Divider />
              </React.Fragment>
            ))}
          </Menu>
        </>
      )}
      
      {/* Ordinamento */}
      {sortOptions && (
        <>
          <Tooltip title="Ordina">
            <IconButton 
              onClick={handleSortMenuOpen}
              aria-controls="sort-menu"
              aria-haspopup="true"
            >
              <SortIcon />
            </IconButton>
          </Tooltip>
          <Menu
            id="sort-menu"
            anchorEl={sortMenuAnchor}
            keepMounted
            open={Boolean(sortMenuAnchor)}
            onClose={handleSortMenuClose}
          >
            {sortOptions.map((option) => (
              <MenuItem 
                key={option.value}
                onClick={() => handleSortChange(option)}
                selected={sortBy === option.value}
              >
                {sortBy === option.value && sortOrder === 'desc' ? '↓ ' : sortBy === option.value && sortOrder === 'asc' ? '↑ ' : ''}
                {option.label}
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
      
      {/* Extra actions */}
      {extraActions && (
        <Box sx={{ ml: 'auto' }}>
          {extraActions}
        </Box>
      )}
    </Box>
  );
};

export default FilterBar;