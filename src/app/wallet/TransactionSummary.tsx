import { ITransaction } from "@/types/blocks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Typography } from "@/components/ui/typography";

interface TransactionSummaryProps {
  transaction: ITransaction;
}

export default function TransactionSummary({
  transaction,
}: TransactionSummaryProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error("Could not copy to clipboard"); 
    }
  };

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(amount);
  };

  return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[800px]">
              <DialogHeader>
                  <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                      <DialogTitle className="text-xl font-semibold">
                          Transaction Created Successfully
                      </DialogTitle>
                  </div>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                  {/* Transaction ID */}
                  {transaction.id && (
                      <div className="flex items-center gap-2">
                          <Typography variant="h5">
                              Transaction ID
                          </Typography>
                          <code className="bg-muted flex-1 rounded p-2 font-mono text-sm">
                              {transaction.id}
                          </code>
                          <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                  copyToClipboard(
                                      transaction.id!,
                                      'Transaction ID'
                                  )
                              }
                          >
                              <Copy className="h-4 w-4" />
                          </Button>
                      </div>
          )}
          
          {/* Transaction Size */}
          {transaction.size > 0 && (
            <div className="flex items-center gap-2">
              <Typography variant="h5">Transaction Size</Typography>
              <code className="text-sm">
                {transaction.size} bytes
              </code>
            </div>
          )}

                  {/* From/To Addresses */}
                  <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                          <CardTitle className="text-muted-foreground text-sm font-medium">
                              From Address
                          </CardTitle>
                
              </CardHeader>
                          <CardContent className="pt-0">
                              <div className="flex items-center gap-2">
                                  <code className="bg-muted flex-1 rounded p-2 font-mono text-sm break-all">
                                      {formatAddress(transaction.from)}
                                  </code>
                                  <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                          copyToClipboard(
                                              transaction.from,
                                              'From Address'
                                          )
                                      }
                                  >
                                      <Copy className="h-4 w-4" />
                                  </Button>
                              </div>
                          </CardContent>
                      </Card>

            <Card>
              <CardHeader>
                  <CardTitle className="text-muted-foreground text-sm font-medium">
                      To Address
                  </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                  <div className="flex items-center gap-2">
                                  <code className="bg-muted flex-1 rounded p-2 font-mono text-sm break-all">
                                      {formatAddress(transaction.to)}
                                  </code>
                                  <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                          copyToClipboard(
                                              transaction.to,
                                              'To Address'
                                          )
                                      }
                                  >
                                      <Copy className="h-4 w-4" />
                                  </Button>
                              </div>
                          </CardContent>
                      </Card>
                  </div>

                  {/* Amount and Fee */}
                  <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                          <CardHeader>
                              <CardTitle className="text-muted-foreground text-sm font-medium">
                                  Amount
                              </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                              <div className="text-2xl font-bold text-green-600">
                                  {formatAmount(transaction.amount)} BTC
                              </div>
                          </CardContent>
                      </Card>

                      <Card>
                          <CardHeader className="pb-2">
                              <CardTitle className="text-muted-foreground text-sm font-medium">
                                  Transaction Fee
                              </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                              <div className="text-2xl font-bold text-orange-600">
                                  {formatAmount(transaction.fee)} BTC
                              </div>
                          </CardContent>
                      </Card>
                  </div>

                  {/* Transaction Inputs */}
                  <Card>
                      <CardHeader>
                          <CardTitle className="text-muted-foreground text-sm font-medium">
                              Transaction Inputs ({transaction.inputs.length})
                          </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                          {transaction.inputs.map((input, index) => (
                              <div
                                  key={index}
                                  className="space-y-2 rounded-lg border p-3"
                              >
                                  <div className="flex items-center justify-between">
                                      <Badge variant="outline">
                                          Input #{index + 1}
                                      </Badge>
                                      <Badge variant="secondary">
                                          Output #{input.outputIndex}
                                      </Badge>
                                  </div>

                                  <div>
                                      <div className="text-muted-foreground mb-1 text-xs">
                                          Previous Transaction ID
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <code className="bg-muted flex-1 rounded p-2 font-mono text-xs break-all">
                                              {input.previousTransactionId}
                                          </code>
                                          <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() =>
                                                  copyToClipboard(
                                                      input.previousTransactionId,
                                                      `Input ${index + 1} Tx ID`
                                                  )
                                              }
                                          >
                                              <Copy className="h-4 w-4" />
                                          </Button>
                                      </div>
                                  </div>

                                  {input.scriptSig && (
                                      <div>
                                          <div className="text-muted-foreground mb-1 text-xs">
                                              Signature
                                          </div>
                                          <code className="bg-muted block rounded p-2 font-mono text-xs break-all">
                                              {input.scriptSig.length > 100
                                                  ? `${input.scriptSig.slice(0, 50)}...${input.scriptSig.slice(-50)}`
                                                  : input.scriptSig}
                                          </code>
                                      </div>
                                  )}
                              </div>
                          ))}
                      </CardContent>
                  </Card>

                  {/* Transaction Outputs */}
                  <Card>
                      <CardHeader>
                          <CardTitle className="text-muted-foreground text-sm font-medium">
                              Transaction Outputs ({transaction.outputs.length})
                          </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                          {transaction.outputs.map((output, index) => (
                              <div
                                  key={index}
                                  className="space-y-2 rounded-lg border p-3"
                              >
                                  <div className="flex items-center justify-between">
                                      <Badge variant="outline">
                                          Output #{index + 1}
                                      </Badge>
                                      <Badge variant="secondary">
                                          Amount: {formatAmount(output.amount)}{' '}
                                          BTC
                                      </Badge>
                                  </div>

                                  <div>
                                      <div className="text-muted-foreground mb-1 text-xs">
                                          Address
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <code className="bg-muted flex-1 rounded p-2 font-mono text-xs break-all">
                                              {formatAddress(output.address)}
                                          </code>
                                          <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() =>
                                                  copyToClipboard(
                                                      output.address,
                                                      `Output ${index + 1} Address`
                                                  )
                                              }
                                          >
                                              <Copy className="h-4 w-4" />
                                          </Button>
                                      </div>
                                  </div>

                                  {output.scriptPubKey && (
                                      <div>
                                          <div className="text-muted-foreground mb-1 text-xs">
                                              Script Pub Key
                                          </div>
                                          <code className="bg-muted block rounded p-2 font-mono text-xs break-all">
                                              {output.scriptPubKey.length > 100
                                                  ? `${output.scriptPubKey.slice(0, 50)}...${output.scriptPubKey.slice(-50)}`
                                                  : output.scriptPubKey}
                                          </code>
                                      </div>
                                  )}
                              </div>
                          ))}
                      </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                      <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() =>
                              copyToClipboard(
                                  JSON.stringify(transaction, null, 2),
                                  'Transaction Data'
                              )
                          }
                      >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Transaction Data
                      </Button>

                      <Button
                          className="flex-1"
                          onClick={() => {
                              setIsOpen(false);
                          }}
                      >
                          Close
                      </Button>
                  </div>
              </div>
          </DialogContent>
      </Dialog>
  );
}