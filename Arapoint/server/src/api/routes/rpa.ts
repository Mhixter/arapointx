import express, { Request, Response } from 'express';
import { techhubRpaService } from '../../services/techhubRpaService';
import { getCapturedSlips, getLatestAnalysis, getLatestSlipHtml } from '../../services/slipCaptureService';

const router = express.Router();

router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    
    if (apiKey) {
      techhubRpaService.setApiKey(apiKey);
    }

    const authResult = await techhubRpaService.authenticate();
    
    res.json({
      success: authResult.success,
      message: authResult.message,
      status: techhubRpaService.getConnectionStatus(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/status', (req: Request, res: Response) => {
  try {
    const status = techhubRpaService.getConnectionStatus();
    res.json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/verify-nin', async (req: Request, res: Response) => {
  try {
    const { nin, apiKey } = req.body;

    if (!nin) {
      return res.status(400).json({
        success: false,
        error: 'NIN is required',
      });
    }

    if (apiKey) {
      techhubRpaService.setApiKey(apiKey);
    }

    const result = await techhubRpaService.verifyNIN(nin);
    
    if (result.success && result.slipHtml) {
      const analysis = await techhubRpaService.captureSlipDesign(result);
      res.json({
        success: true,
        data: result.data,
        slipAnalysis: analysis,
      });
    } else {
      res.json({
        success: result.success,
        data: result.data,
        error: result.error,
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/analyze-slips', async (req: Request, res: Response) => {
  try {
    const analysis = await techhubRpaService.analyzeCompetitorSlips();
    
    res.json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/capture-dashboard', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;

    if (apiKey) {
      techhubRpaService.setApiKey(apiKey);
    }

    const dashboardData = await techhubRpaService.fetchDashboardData();
    
    res.json({
      success: dashboardData.success,
      captured: !!dashboardData.html,
      error: dashboardData.error,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/set-api-key', (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key is required',
      });
    }

    techhubRpaService.setApiKey(apiKey);
    
    res.json({
      success: true,
      message: 'API key configured',
      status: techhubRpaService.getConnectionStatus(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/captured-slips', async (req: Request, res: Response) => {
  try {
    const { provider } = req.query;
    const slips = await getCapturedSlips(provider as string | undefined);
    
    res.json({
      success: true,
      count: slips.length,
      files: slips,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/latest-analysis', async (req: Request, res: Response) => {
  try {
    const { provider } = req.query;
    const analysis = await getLatestAnalysis(provider as string | undefined);
    
    if (!analysis) {
      return res.json({
        success: true,
        message: 'No slip captures found yet. Perform a verification using TechHub to capture their slip design.',
        analysis: null,
      });
    }
    
    res.json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/latest-slip-html', async (req: Request, res: Response) => {
  try {
    const { provider } = req.query;
    const html = await getLatestSlipHtml(provider as string | undefined);
    
    if (!html) {
      return res.status(404).json({
        success: false,
        message: 'No slip captures found. Perform a verification using TechHub to capture their slip design.',
      });
    }
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
