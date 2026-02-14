import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, FileUp, FileText, FileCheck, Gift, RotateCw, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { servicesApi } from "@/lib/api/services";

const JAMB_SERVICES = [
  {
    id: "olevel-upload",
    name: "O'Level Upload",
    description: "Upload and verify your O'Level examination results",
    icon: FileUp,
    price: 2000,
    fields: [
      { name: "fullName", label: "Full Name", type: "text", required: true },
      { name: "regNumber", label: "Registration Number", type: "text", required: true },
      { name: "examYear", label: "Exam Year", type: "number", required: true },
      { name: "examBody", label: "Exam Body (WAEC/NECO/NBAIS)", type: "text", required: true },
      { name: "document", label: "Upload O'Level Certificate", type: "file", required: true },
    ]
  },
  {
    id: "admission-letter",
    name: "Admission Letter",
    description: "Check and download your admission status and letter",
    icon: FileText,
    price: 1500,
    fields: [
      { name: "jamb-reg", label: "JAMB Registration Number", type: "text", required: true },
      { name: "email", label: "Email Address", type: "email", required: true },
    ]
  },
  {
    id: "original-result",
    name: "Original Result",
    description: "Retrieve your original JAMB UTME/DE examination results",
    icon: FileCheck,
    price: 1800,
    fields: [
      { name: "jamb-reg", label: "JAMB Registration Number", type: "text", required: true },
      { name: "pin", label: "JAMB Result PIN", type: "text", required: true },
    ]
  },
  {
    id: "pin-vending",
    name: "PIN Vending",
    description: "Purchase JAMB result checker PINs in bulk",
    icon: Gift,
    price: 0,
    fields: [
      { name: "quantity", label: "Quantity of PINs", type: "number", required: true },
    ]
  },
  {
    id: "reprinting-caps",
    name: "Reprinting & Caps",
    description: "Request reprinting of JAMB documents and academic caps",
    icon: RotateCw,
    price: 3000,
    fields: [
      { name: "jamb-reg", label: "JAMB Registration Number", type: "text", required: true },
      { name: "itemType", label: "Item Type", type: "text", placeholder: "e.g., Certificate, Transcript, Cap", required: true },
      { name: "quantity", label: "Quantity", type: "number", required: true },
    ]
  },
];

export default function JAMBServices() {
  const { toast } = useToast();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [requestComplete, setRequestComplete] = useState(false);
  const [completedService, setCompletedService] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const service = selectedService ? JAMB_SERVICES.find(s => s.id === selectedService) : null;

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !service) return;
    
    setIsLoading(true);

    try {
      const result = await servicesApi.education.submitRequest(selectedService, formData);
      
      setIsLoading(false);
      setRequestComplete(true);
      setCompletedService(service);
      toast({
        title: "Request Submitted",
        description: `Your ${service.name} request has been submitted successfully (ID: ${result.trackingId}).`,
      });
    } catch (error: any) {
      setIsLoading(false);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit request. Please check your balance.",
        variant: "destructive"
      });
    }
  };

  if (requestComplete && completedService) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold tracking-tight">JAMB Services</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">Request confirmation</p>
        </div>

        <Card className="max-w-2xl mx-auto text-center border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
          <CardContent className="pt-10 pb-10 space-y-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold text-green-800 dark:text-green-400">Request Submitted Successfully!</h3>
            <p className="text-green-700 dark:text-green-300 max-w-xs mx-auto">
              Your {completedService.name} request has been received and is being processed. You will be notified via email.
            </p>
            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 my-6 space-y-2 text-left">
              <div className="flex items-center gap-2">
                <completedService.icon className="h-5 w-5 text-primary" />
                <span className="font-bold">{completedService.name}</span>
              </div>
            </div>
            <Button onClick={() => { setRequestComplete(false); setSelectedService(null); }} className="w-full">
              <ArrowRight className="mr-2 h-4 w-4" />
              Request Another Service
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedService && service) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <Button variant="outline" onClick={() => setSelectedService(null)} className="mb-4">
            ← Back to Services
          </Button>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold tracking-tight">{service.name}</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">{service.description}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Service Request Form</CardTitle>
            <CardDescription>Fill in the required information to proceed.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {service.fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </Label>
                  {field.type === "file" ? (
                    <Input
                      id={field.name}
                      type="file"
                      required={field.required}
                      className="h-10"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleInputChange(field.name, e.target.files?.[0]?.name || "")}
                    />
                  ) : (
                    <Input
                      id={field.name}
                      type={field.type}
                      placeholder={field.placeholder || ""}
                      required={field.required}
                      className="h-10"
                      value={formData[field.name] || ""}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                    />
                  )}
                </div>
              ))}

              <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <service.icon className="mr-2 h-4 w-4" />
                    Submit Request
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold tracking-tight">JAMB Services</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">Access all JAMB-related services and requests.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {JAMB_SERVICES.map((svc) => {
          const Icon = svc.icon;
          return (
            <Card key={svc.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedService(svc.id)}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      {svc.name}
                    </CardTitle>
                    <CardDescription>{svc.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full" onClick={() => setSelectedService(svc.id)}>
                    Request Service
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
