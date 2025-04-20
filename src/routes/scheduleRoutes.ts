import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import { ScheduleConfiguration } from '../types/inputTypes';
import { apiClient } from '../services/apiClient';
import { scheduleGenerator } from '../algorithm/scheduleGenerator';
import { validateConfiguration } from '../utils/validationHelper';

const router = express.Router();

/**
 * POST /api/schedule/generate
 * Generate a new flight schedule
 */
router.post('/generate', [
  // Validation middleware
  body('airline_id').isInt({ min: 1 }).withMessage('Airline ID must be a positive integer'),
  body('airline_name').isString().notEmpty().withMessage('Airline name is required'),
  body('start_airport').isString().isLength({ min: 3, max: 4 }).withMessage('Start airport must be a valid IATA code'),
  body('days').isInt({ min: 1, max: 30 }).withMessage('Days must be between 1 and 30'),
  body('haul_preferences').isObject().withMessage('Haul preferences must be an object'),
  body('haul_weighting').isObject().withMessage('Haul weighting must be an object'),
  body('prefer_single_leg_day_ratio').isFloat({ min: 0, max: 1 }).withMessage('Single leg day ratio must be between 0 and 1'),
  body('operating_hours').isObject().withMessage('Operating hours must be an object'),
  body('turnaround_time_minutes').isInt({ min: 30, max: 180 }).withMessage('Turnaround time must be between 30 and 180 minutes'),
  body('preferred_countries').isArray().withMessage('Preferred countries must be an array'),
  body('preferred_regions').isArray().withMessage('Preferred regions must be an array'),
  body('minimum_rest_hours_between_long_haul').isInt({ min: 6, max: 24 }).withMessage('Minimum rest hours must be between 6 and 24')
], async (req: Request, res: Response) => {
  try {
    const config: ScheduleConfiguration = req.body;
    
    // Perform custom validation
    const validationResult = validateConfiguration(config);

    // Check for validation errors
    const errors = validationResult.errors;
    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        errors: errors
      });
    }

    if (!validationResult.valid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid configuration',
        errors: validationResult.errors
      });
    }
    
    // Fetch routes for the airline
    const routes = await apiClient.getRoutesForAirline(config.airline_id);
    
    if (routes.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: `No routes found for airline ID ${config.airline_id}`
      });
    }
    
    // Generate the schedule
    const schedule = await scheduleGenerator.generateSchedule(config, routes);
    
    return res.status(200).json({
      status: 'success',
      schedule
    });
  } catch (error) {
    console.error('Error generating schedule:', error);
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
});

/**
 * GET /api/schedule/validate
 * Validate schedule configuration
 */
router.post('/validate', async (req, res) => {
  try {
    const config: Partial<ScheduleConfiguration> = req.body;
    
    // Check if required fields are present
    const missingFields: string[] = [];
    const requiredFields = [
      'airline_id', 'airline_name', 'start_airport', 'days',
      'haul_preferences', 'haul_weighting', 'prefer_single_leg_day_ratio',
      'operating_hours', 'turnaround_time_minutes', 'preferred_countries',
      'preferred_regions', 'minimum_rest_hours_between_long_haul'
    ];
    
    for (const field of requiredFields) {
      if (!(field in config)) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields',
        missing_fields: missingFields
      });
    }
    
    // Perform validation
    const validationResult = validateConfiguration(config as ScheduleConfiguration);
    
    if (!validationResult.valid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid configuration',
        errors: validationResult.errors
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Configuration is valid'
    });
  } catch (error) {
    console.error('Error validating configuration:', error);
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
});

/**
 * GET /api/schedule/airlines
 * Get all airlines
 */
router.get('/airlines', async (req, res) => {
  try {
    const airlines = await apiClient.getAirlines();
    return res.status(200).json({
      status: 'success',
      airlines: airlines.airlines
    });
  } catch (error) {
    console.error('Error fetching airlines:', error);
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
});

/**
 * GET /api/schedule/airline/:id
 * Get airline by ID
 */
router.get('/airline/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid airline ID'
      });
    }
    
    const airline = await apiClient.getAirlineById(id);
    
    if (!airline) {
      return res.status(404).json({
        status: 'error',
        message: `Airline with ID ${id} not found`
      });
    }
    
    return res.status(200).json({
      status: 'success',
      airline
    });
  } catch (error) {
    console.error('Error fetching airline:', error);
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
});

export default router;
