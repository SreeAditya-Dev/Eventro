
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Plus, Edit, Trash2, UploadCloud, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { services as geminiService } from "@/services/geminiService";

interface Bill {
  id: string;
  event_id: string;
  bill_name: string;
  bill_amount: number;
  bill_date: string;
  bill_category: string;
  bill_description: string | null;
  receipt_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface CategoryTotal {
  category: string;
  total: number;
}

const CATEGORIES = [
  "Venue",
  "Catering",
  "Equipment",
  "Marketing",
  "Staff",
  "Transportation",
  "Accommodation",
  "Miscellaneous"
];

const EventFinancials = ({ eventId }: { eventId: string }) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [isInsightsDialogOpen, setIsInsightsDialogOpen] = useState(false);
  const [currentBill, setCurrentBill] = useState<Bill | null>(null);
  const [imageAnalysisLoading, setImageAnalysisLoading] = useState(false);
  const [insights, setInsights] = useState("");
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);

  // Form states
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDate, setBillDate] = useState<Date | undefined>(new Date());
  const [billCategory, setBillCategory] = useState("");
  const [billDescription, setBillDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

  useEffect(() => {
    if (eventId) {
      fetchBills();
    }
  }, [eventId]);

  useEffect(() => {
    if (bills.length > 0) {
      calculateTotals();
    }
  }, [bills]);

  const calculateTotals = () => {
    // Group bills by category and sum amounts
    const categories = bills.reduce((acc: Record<string, number>, bill) => {
      const category = bill.bill_category;
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += Number(bill.bill_amount);
      return acc;
    }, {});

    // Convert to array of objects
    const categoryTotalsData = Object.entries(categories).map(([category, total]) => ({
      category,
      total
    }));

    setCategoryTotals(categoryTotalsData);

    // Calculate total expenses
    const total = bills.reduce((sum, bill) => sum + Number(bill.bill_amount), 0);
    setTotalExpenses(total);
  };

  const fetchBills = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('event_financials')
        .select('*')
        .eq('event_id', eventId)
        .order('bill_date', { ascending: false });

      if (error) throw error;
      setBills(data || []);
    } catch (error: any) {
      toast.error("Error loading financial data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setBillName("");
    setBillAmount("");
    setBillDate(new Date());
    setBillCategory("");
    setBillDescription("");
    setSelectedImage(null);
    setImagePreviewUrl("");
    setCurrentBill(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (bill: Bill) => {
    setCurrentBill(bill);
    setBillName(bill.bill_name);
    setBillAmount(bill.bill_amount.toString());
    setBillDate(new Date(bill.bill_date));
    setBillCategory(bill.bill_category);
    setBillDescription(bill.bill_description || "");
    if (bill.receipt_url) {
      setImagePreviewUrl(bill.receipt_url);
    } else {
      setImagePreviewUrl("");
    }
    setIsEditDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const fileUrl = URL.createObjectURL(file);
      setImagePreviewUrl(fileUrl);
    }
  };

  const uploadReceipt = async (): Promise<string | null> => {
    if (!selectedImage) return null;

    try {
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `${Date.now()}-receipt.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error } = await supabase.storage
        .from('receipts')
        .upload(filePath, selectedImage);

      if (error) throw error;

      // Get public URL for the uploaded file
      const { data } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      toast.error("Error uploading receipt: " + error.message);
      return null;
    }
  };

  const handleAddBill = async () => {
    try {
      if (!billName || !billAmount || !billCategory) {
        toast.error("Please fill in all required fields");
        return;
      }

      let receiptUrl = null;
      if (selectedImage) {
        receiptUrl = await uploadReceipt();
      }

      const { data, error } = await supabase
        .from('event_financials')
        .insert([{
          event_id: eventId,
          bill_name: billName,
          bill_amount: parseFloat(billAmount),
          bill_date: billDate?.toISOString() || new Date().toISOString(),
          bill_category: billCategory,
          bill_description: billDescription || null,
          receipt_url: receiptUrl
        }])
        .select();

      if (error) throw error;

      toast.success("Bill added successfully");
      setIsAddDialogOpen(false);
      resetForm();
      fetchBills();
    } catch (error: any) {
      toast.error("Error adding bill: " + error.message);
    }
  };

  const handleUpdateBill = async () => {
    try {
      if (!currentBill || !billName || !billAmount || !billCategory) {
        toast.error("Please fill in all required fields");
        return;
      }

      let receiptUrl = currentBill.receipt_url;
      if (selectedImage) {
        receiptUrl = await uploadReceipt();
      }

      const { data, error } = await supabase
        .from('event_financials')
        .update({
          bill_name: billName,
          bill_amount: parseFloat(billAmount),
          bill_date: billDate?.toISOString() || new Date().toISOString(),
          bill_category: billCategory,
          bill_description: billDescription || null,
          receipt_url: receiptUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentBill.id)
        .select();

      if (error) throw error;

      toast.success("Bill updated successfully");
      setIsEditDialogOpen(false);
      resetForm();
      fetchBills();
    } catch (error: any) {
      toast.error("Error updating bill: " + error.message);
    }
  };

  const handleDeleteBill = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this bill?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('event_financials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Bill deleted successfully");
      fetchBills();
    } catch (error: any) {
      toast.error("Error deleting bill: " + error.message);
    }
  };

  const analyzeReceiptWithAI = async () => {
    if (!selectedImage) {
      toast.error("Please select an image to analyze");
      return;
    }

    try {
      setImageAnalysisLoading(true);
      toast.info("Analyzing receipt...");

      const reader = new FileReader();
      reader.readAsDataURL(selectedImage);
      reader.onload = async () => {
        const base64Image = reader.result as string;

        try {
          // Call Gemini service to analyze receipt (with fallback)
          const response = await geminiService.analyzeReceipt(base64Image);

          if (response && response.data) {
            const { name, amount, date, category, description } = response.data;

            // Update form fields with extracted data
            if (name) setBillName(name);
            if (amount) setBillAmount(amount.toString());
            if (date && new Date(date).toString() !== 'Invalid Date') {
              setBillDate(new Date(date));
            }
            if (category) setBillCategory(category);
            if (description) setBillDescription(description);

            toast.success("Receipt analyzed successfully!");

            // Log the extracted data for debugging
            console.log("Extracted receipt data:", {
              name, amount, date, category, description
            });
          } else {
            toast.warning("Could not extract all information from receipt");
          }
        } catch (error: any) {
          console.error("Error analyzing receipt:", error);

          // Show a more helpful error message
          toast.error("Error analyzing receipt. Using fallback method instead.");

          // Use a simple fallback method to generate some data
          const fallbackData = {
            name: "Receipt Item",
            amount: "0.00",
            date: new Date().toISOString().split('T')[0],
            category: "Other",
            description: "Please enter details manually"
          };

          // Update form with fallback data
          setBillName(fallbackData.name);
          setBillAmount(fallbackData.amount);
          setBillDate(new Date(fallbackData.date));
          setBillCategory(fallbackData.category);
          setBillDescription(fallbackData.description);
        } finally {
          setImageAnalysisLoading(false);
        }
      };

      // Handle file reading errors
      reader.onerror = () => {
        setImageAnalysisLoading(false);
        toast.error("Error reading image file");
      };
    } catch (error: any) {
      setImageAnalysisLoading(false);
      toast.error("Error processing image");
      console.error("Image processing error:", error);
    }
  };

  const getFinancialInsights = async () => {
    if (bills.length === 0) {
      toast.error("No financial data available for insights");
      return;
    }

    try {
      setInsightsLoading(true);

      // Prepare data for the AI
      const financialData = {
        totalExpenses,
        categoryBreakdown: categoryTotals,
        numberOfBills: bills.length,
        eventId,
        largestExpense: bills.reduce((max, bill) =>
          Number(bill.bill_amount) > Number(max.bill_amount) ? bill : max, bills[0]),
        billsOverTime: bills.map(bill => ({
          date: bill.bill_date,
          amount: bill.bill_amount,
          category: bill.bill_category,
          name: bill.bill_name
        }))
      };

      // Call Gemini service to get insights
      const response = await geminiService.getFinancialInsights(financialData);

      if (response && response.insights) {
        setInsights(response.insights);
        setIsInsightsDialogOpen(true);
      } else {
        toast.warning("Could not generate insights at this time");
      }
    } catch (error: any) {
      console.error("Error getting financial insights:", error);
      toast.error("Error generating insights. Please try again later.");
    } finally {
      setInsightsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Financial Management</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => getFinancialInsights()}
            disabled={bills.length === 0 || insightsLoading}
          >
            {insightsLoading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-event-purple border-r-transparent align-[-0.125em]"></span>
            ) : (
              <DollarSign className="h-4 w-4" />
            )}
            Get Insights
          </Button>
          <Button onClick={openAddDialog} className="bg-event-purple hover:bg-event-purple/90">
            <Plus className="mr-2 h-4 w-4" /> Add Bill
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Financial Summary */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-500">Total Expenses</div>
              <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-500">Number of Bills</div>
              <div className="text-2xl font-bold">{bills.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-500">Top Category</div>
              <div className="text-2xl font-bold">
                {categoryTotals.length > 0
                  ? categoryTotals.sort((a, b) => b.total - a.total)[0]?.category || "N/A"
                  : "N/A"
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-event-purple border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-2 text-gray-500">Loading financial data...</p>
          </div>
        ) : bills.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Bills & Expenses</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left">Name</th>
                    <th className="py-2 text-left">Amount</th>
                    <th className="py-2 text-left">Category</th>
                    <th className="py-2 text-left">Date</th>
                    <th className="py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => (
                    <tr key={bill.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">
                        <div className="font-medium">{bill.bill_name}</div>
                        {bill.bill_description && (
                          <div className="text-xs text-gray-500">{bill.bill_description}</div>
                        )}
                      </td>
                      <td className="py-3">${Number(bill.bill_amount).toFixed(2)}</td>
                      <td className="py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100">
                          {bill.bill_category}
                        </span>
                      </td>
                      <td className="py-3">{format(new Date(bill.bill_date), "MMM d, yyyy")}</td>
                      <td className="py-3">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(bill)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteBill(bill.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Category breakdown */}
            <div className="mt-8">
              <h3 className="text-lg font-medium mb-4">Expenses by Category</h3>
              <div className="space-y-3">
                {categoryTotals.map((cat) => (
                  <div key={cat.category} className="flex items-center">
                    <div className="w-32">{cat.category}</div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-event-purple h-2.5 rounded-full"
                          style={{ width: `${(cat.total / totalExpenses) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="w-24 text-right">${cat.total.toFixed(2)}</div>
                    <div className="w-20 text-right text-gray-500">
                      {((cat.total / totalExpenses) * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">No financial data added yet</p>
            <Button onClick={openAddDialog} className="bg-event-purple hover:bg-event-purple/90">
              <Plus className="mr-2 h-4 w-4" /> Add First Bill
            </Button>
          </div>
        )}
      </CardContent>

      {/* Add Bill Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Bill</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bill-name">Bill Name *</Label>
                  <Input
                    id="bill-name"
                    value={billName}
                    onChange={(e) => setBillName(e.target.value)}
                    placeholder="Enter bill name"
                  />
                </div>

                <div>
                  <Label htmlFor="bill-amount">Amount ($) *</Label>
                  <Input
                    id="bill-amount"
                    type="number"
                    step="0.01"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="bill-category">Category *</Label>
                  <Select value={billCategory} onValueChange={(value) => setBillCategory(value)}>
                    <SelectTrigger id="bill-category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !billDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {billDate ? format(billDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={billDate}
                        onSelect={setBillDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="bill-description">Description</Label>
                  <Textarea
                    id="bill-description"
                    value={billDescription}
                    onChange={(e) => setBillDescription(e.target.value)}
                    placeholder="Add any additional details"
                    className="h-20"
                  />
                </div>

                <div>
                  <Label>Receipt Image</Label>
                  <div className="mt-2 flex flex-col items-center border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                    <input
                      type="file"
                      id="receipt-image"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    {imagePreviewUrl ? (
                      <div className="w-full">
                        <img
                          src={imagePreviewUrl}
                          alt="Receipt preview"
                          className="mx-auto max-h-40 object-contain mb-2"
                        />
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedImage(null);
                              setImagePreviewUrl("");
                            }}
                          >
                            Remove
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={analyzeReceiptWithAI}
                            disabled={imageAnalysisLoading}
                          >
                            {imageAnalysisLoading ? (
                              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em]"></span>
                            ) : (
                              "Analyze with AI"
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor="receipt-image"
                        className="flex flex-col items-center cursor-pointer"
                      >
                        <UploadCloud className="h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-400">
                          JPEG, PNG, JPG up to 10MB
                        </p>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBill} className="bg-event-purple hover:bg-event-purple/90">
              Save Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bill Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Bill</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-bill-name">Bill Name *</Label>
                  <Input
                    id="edit-bill-name"
                    value={billName}
                    onChange={(e) => setBillName(e.target.value)}
                    placeholder="Enter bill name"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-bill-amount">Amount ($) *</Label>
                  <Input
                    id="edit-bill-amount"
                    type="number"
                    step="0.01"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-bill-category">Category *</Label>
                  <Select value={billCategory} onValueChange={(value) => setBillCategory(value)}>
                    <SelectTrigger id="edit-bill-category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !billDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {billDate ? format(billDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={billDate}
                        onSelect={setBillDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-bill-description">Description</Label>
                  <Textarea
                    id="edit-bill-description"
                    value={billDescription}
                    onChange={(e) => setBillDescription(e.target.value)}
                    placeholder="Add any additional details"
                    className="h-20"
                  />
                </div>

                <div>
                  <Label>Receipt Image</Label>
                  <div className="mt-2 flex flex-col items-center border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                    <input
                      type="file"
                      id="edit-receipt-image"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    {imagePreviewUrl ? (
                      <div className="w-full">
                        <img
                          src={imagePreviewUrl}
                          alt="Receipt preview"
                          className="mx-auto max-h-40 object-contain mb-2"
                        />
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedImage(null);
                              setImagePreviewUrl("");
                            }}
                          >
                            Remove
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={analyzeReceiptWithAI}
                            disabled={imageAnalysisLoading}
                          >
                            {imageAnalysisLoading ? (
                              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em]"></span>
                            ) : (
                              "Analyze with AI"
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor="edit-receipt-image"
                        className="flex flex-col items-center cursor-pointer"
                      >
                        <UploadCloud className="h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-400">
                          JPEG, PNG, JPG up to 10MB
                        </p>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBill} className="bg-event-purple hover:bg-event-purple/90">
              Update Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Insights Dialog */}
      <Dialog open={isInsightsDialogOpen} onOpenChange={setIsInsightsDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Financial Insights</DialogTitle>
          </DialogHeader>

          <div className="py-4 max-h-[60vh] overflow-y-auto">
            {insightsLoading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-event-purple border-r-transparent align-[-0.125em]"></div>
                <p className="mt-4 text-gray-500">Analyzing your financial data...</p>
              </div>
            ) : (
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: insights }}></div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setIsInsightsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default EventFinancials;
