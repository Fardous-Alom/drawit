import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { 
  Paintbrush, 
  Eraser, 
  Download, 
  Trash2, 
  Undo, 
  Square, 
  Circle, 
  MousePointer,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Tool = 'brush' | 'eraser' | 'rectangle' | 'circle' | 'select';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState([5]);
  const [tool, setTool] = useState<Tool>('brush');
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
  const { toast } = useToast();
  
  // Shape drawing variables
  const startPositionRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size to match parent container
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        // Restore canvas content after resize
        if (historyIndex >= 0 && history[historyIndex]) {
          const context = canvas.getContext('2d');
          if (context) {
            context.putImageData(history[historyIndex], 0, 0);
          }
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize canvas context
    const context = canvas.getContext('2d');
    if (context) {
      context.lineCap = 'round';
      context.lineJoin = 'round';
      setCtx(context);
      
      // Save initial blank canvas state
      const initialState = context.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialState]);
      setHistoryIndex(0);
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Save canvas state to history
  const saveState = () => {
    if (!canvasRef.current || !ctx) return;
    
    const canvas = canvasRef.current;
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // If we're not at the end of the history, remove future states
    if (historyIndex < history.length - 1) {
      setHistory(history.slice(0, historyIndex + 1));
    }
    
    setHistory(prev => [...prev, currentState]);
    setHistoryIndex(prev => prev + 1);
  };

  // Undo function
  const handleUndo = () => {
    if (historyIndex <= 0) return;
    
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    
    if (!canvasRef.current || !ctx) return;
    ctx.putImageData(history[newIndex], 0, 0);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!ctx || !canvasRef.current) return;
    
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      // Touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    if (tool === 'brush' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = brushSize[0];
    } else if (tool === 'rectangle' || tool === 'circle') {
      startPositionRef.current = { x, y };
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctx || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      // Touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      
      // Prevent scrolling while drawing
      e.preventDefault();
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    if (tool === 'brush' || tool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if ((tool === 'rectangle' || tool === 'circle') && startPositionRef.current) {
      // For shape drawing, we need to clear and redraw on each move
      const startPos = startPositionRef.current;
      
      // Restore the canvas to the state before starting to draw the shape
      if (historyIndex >= 0) {
        ctx.putImageData(history[historyIndex], 0, 0);
      }
      
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize[0];
      ctx.beginPath();
      
      if (tool === 'rectangle') {
        ctx.rect(
          startPos.x, 
          startPos.y, 
          x - startPos.x, 
          y - startPos.y
        );
      } else if (tool === 'circle') {
        // Calculate radius based on distance
        const radius = Math.sqrt(
          Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2)
        );
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      }
      
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    if (ctx) {
      ctx.closePath();
    }
    
    setIsDrawing(false);
    startPositionRef.current = null;
    
    // Save the current state to history
    saveState();
  };

  const clearCanvas = () => {
    if (!ctx || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save the cleared state
    saveState();
    
    toast({
      title: "Canvas cleared",
      description: "Your drawing has been cleared.",
    });
  };

  const downloadCanvas = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    
    link.download = 'drawing.png';
    link.href = dataURL;
    link.click();
    
    toast({
      title: "Download started",
      description: "Your drawing is being downloaded.",
    });
  };

  const toggleMobileTools = () => {
    setIsMobileToolsOpen(!isMobileToolsOpen);
  };

  const handleToolSelect = (selectedTool: Tool) => {
    setTool(selectedTool);
    // On mobile, close the tools panel after selecting a tool
    if (window.innerWidth < 768) {
      setIsMobileToolsOpen(false);
    }
  };

  // Quick action toolbar for mobile
  const QuickToolbar = () => (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-background/90 backdrop-blur-sm rounded-full shadow-lg border border-border p-1 flex items-center space-x-1">
      <Button
        variant={tool === 'brush' ? "default" : "ghost"}
        size="icon"
        onClick={() => handleToolSelect('brush')}
        className="h-10 w-10 rounded-full"
      >
        <Paintbrush className="h-5 w-5" />
      </Button>
      <Button
        variant={tool === 'eraser' ? "default" : "ghost"}
        size="icon"
        onClick={() => handleToolSelect('eraser')}
        className="h-10 w-10 rounded-full"
      >
        <Eraser className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleUndo}
        disabled={historyIndex <= 0}
        className="h-10 w-10 rounded-full"
      >
        <Undo className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={clearCanvas}
        className="h-10 w-10 rounded-full"
      >
        <Trash2 className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMobileTools}
        className="h-10 w-10 rounded-full"
      >
        <Menu className="h-5 w-5" />
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col h-screen p-2 sm:p-4 bg-background">
      <header className="flex items-center justify-between mb-2 sm:mb-4">
        <h1 className="text-xl sm:text-2xl font-bold">Drawing App</h1>
        <div className="md:hidden">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={toggleMobileTools}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>
      
      <div className="flex flex-1 gap-2 sm:gap-4 overflow-hidden relative">
        <div className="flex-1 relative overflow-hidden rounded-lg border border-border">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full bg-white cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
        
        {/* Desktop sidebar */}
        <Card className="w-64 shrink-0 hidden md:block">
          <CardHeader className="pb-3">
            <CardTitle>Tools</CardTitle>
            <CardDescription>Customize your drawing</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Tabs defaultValue="tools" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tools">Tools</TabsTrigger>
                <TabsTrigger value="colors">Colors</TabsTrigger>
              </TabsList>
              
              <TabsContent value="tools" className="space-y-4 pt-2">
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={tool === 'brush' ? "default" : "outline"}
                    size="icon"
                    onClick={() => setTool('brush')}
                    title="Brush"
                  >
                    <Paintbrush className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={tool === 'eraser' ? "default" : "outline"}
                    size="icon"
                    onClick={() => setTool('eraser')}
                    title="Eraser"
                  >
                    <Eraser className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={tool === 'rectangle' ? "default" : "outline"}
                    size="icon"
                    onClick={() => setTool('rectangle')}
                    title="Rectangle"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={tool === 'circle' ? "default" : "outline"}
                    size="icon"
                    onClick={() => setTool('circle')}
                    title="Circle"
                  >
                    <Circle className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Brush Size</span>
                    <span className="text-sm font-medium">{brushSize[0]}px</span>
                  </div>
                  <Slider
                    value={brushSize}
                    min={1}
                    max={50}
                    step={1}
                    onValueChange={setBrushSize}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="colors" className="pt-2 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm">Current Color</label>
                  <div 
                    className="h-8 w-full rounded-md border border-input"
                    style={{ backgroundColor: color }}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="color-picker" className="text-sm">
                    Pick a Color
                  </label>
                  <Input
                    id="color-picker"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 p-1 w-full hover:cursor-pointer rounded-md border border-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm">Quick Colors</label>
                  <div className="grid grid-cols-5 gap-2">
                    {['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
                      '#ff00ff', '#00ffff', '#ffffff', '#ff9900', '#9900ff'].map((clr) => (
                      <button
                        key={clr}
                        className={cn(
                          "h-6 w-6 rounded-md border border-input",
                          color === clr && "ring-2 ring-ring ring-offset-2"
                        )}
                        style={{ backgroundColor: clr }}
                        onClick={() => setColor(clr)}
                      />
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          
          <Separator />
          
          <CardFooter className="absolute flex flex-col gap-2 pt-4 bottom-0">
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button 
                variant="outline" 
                onClick={handleUndo}
                disabled={historyIndex <= 0}
              >
                <Undo className="h-4 w-4 mr-2" />
                Undo
              </Button>
              <Button 
                variant="outline" 
                onClick={clearCanvas}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
            <Button 
              className="w-full" 
              onClick={downloadCanvas}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </CardFooter>
        </Card>
        
        {/* Mobile tools panel */}
        {isMobileToolsOpen && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 md:hidden">
            <div className="h-full w-full max-w-sm mx-auto p-4 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Drawing Tools</h2>
                <Button variant="ghost" size="icon" onClick={toggleMobileTools}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <Card className="flex-1">
                <CardContent className="pt-6 space-y-6">
                  <Tabs defaultValue="tools" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="tools">Tools</TabsTrigger>
                      <TabsTrigger value="colors">Colors</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="tools" className="space-y-6 pt-4">
                      <div className="grid grid-cols-3 gap-3">
                        <Button
                          variant={tool === 'brush' ? "default" : "outline"}
                          className="h-16 flex flex-col gap-1 items-center justify-center"
                          onClick={() => handleToolSelect('brush')}
                        >
                          <Paintbrush className="h-6 w-6" />
                          <span className="text-xs">Brush</span>
                        </Button>
                        <Button
                          variant={tool === 'eraser' ? "default" : "outline"}
                          className="h-16 flex flex-col gap-1 items-center justify-center"
                          onClick={() => handleToolSelect('eraser')}
                        >
                          <Eraser className="h-6 w-6" />
                          <span className="text-xs">Eraser</span>
                        </Button>
                        <Button
                          variant={tool === 'rectangle' ? "default" : "outline"}
                          className="h-16 flex flex-col gap-1 items-center justify-center"
                          onClick={() => handleToolSelect('rectangle')}
                        >
                          <Square className="h-6 w-6" />
                          <span className="text-xs">Rectangle</span>
                        </Button>
                        <Button
                          variant={tool === 'circle' ? "default" : "outline"}
                          className="h-16 flex flex-col gap-1 items-center justify-center"
                          onClick={() => handleToolSelect('circle')}
                        >
                          <Circle className="h-6 w-6" />
                          <span className="text-xs">Circle</span>
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>Brush Size</span>
                          <span className="font-medium">{brushSize[0]}px</span>
                        </div>
                        <Slider
                          value={brushSize}
                          min={1}
                          max={50}
                          step={1}
                          onValueChange={setBrushSize}
                          className="py-2"
                        />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="colors" className="pt-4 space-y-6">
                      <div className="space-y-3">
                        <label>Current Color</label>
                        <div 
                          className="h-12 w-full rounded-md border border-input"
                          style={{ backgroundColor: color }}
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <label htmlFor="mobile-color-picker">
                          Pick a Color
                        </label>
                        <Input
                          id="mobile-color-picker"
                          type="color"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="h-12 p-1 w-full"
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <label>Quick Colors</label>
                        <div className="grid grid-cols-5 gap-3">
                          {['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
                            '#ff00ff', '#00ffff', '#ffffff', '#ff9900', '#9900ff'].map((clr) => (
                            <button
                              key={clr}
                              className={cn(
                                "h-10 w-full rounded-md border border-input",
                                color === clr && "ring-2 ring-ring ring-offset-2"
                              )}
                              style={{ backgroundColor: clr }}
                              onClick={() => setColor(clr)}
                            />
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
                
                <Separator />
                
                <CardFooter className="absolute bottom-0 pl-20 flex flex-col gap-3 pt-6">
                  <div className="grid grid-cols-2 gap-3 w-full mb-4">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        handleUndo();
                        toggleMobileTools();
                      }}
                      disabled={historyIndex <= 0}
                      className="h-12"
                    >
                      <Undo className="h-5 w-5 mr-2" />
                      Undo
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        clearCanvas();
                        toggleMobileTools();
                      }}
                      className="h-12"
                    >
                      <Trash2 className="h-5 w-5 mr-2" />
                      Clear
                    </Button>
                  </div>
                  <Button 
                    className="w-full h-12" 
                    onClick={() => {
                      downloadCanvas();
                      toggleMobileTools();
                    }}
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
        
        {/* Mobile quick toolbar */}
        <div className="md:hidden">
          <QuickToolbar />
        </div>
      </div>
    </div>
  );
}

export default App;