import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { DomainProvider, HistoryProvider, ThemeProvider, ScanResultsProvider, MonitorProvider, SettingsProvider } from './lib/store'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import QuickScan from './pages/QuickScan'
import DNSLookup from './pages/DNSLookup'
import BlacklistCheck from './pages/BlacklistCheck'
import SPFCheck from './pages/SPFCheck'
import DKIMCheck from './pages/DKIMCheck'
import DMARCCheck from './pages/DMARCCheck'
import SMTPTest from './pages/SMTPTest'
import PortScan from './pages/PortScan'
import ReverseDNS from './pages/ReverseDNS'
import HeaderAnalyzer from './pages/HeaderAnalyzer'
import WhoisLookup from './pages/WhoisLookup'
import MXLookup from './pages/MXLookup'
import { ToastProvider } from './components/Toast'
import MTASTSCheck from './pages/MTASTSCheck'
import TLSRPTCheck from './pages/TLSRPTCheck'
import BIMICheck from './pages/BIMICheck'
import DNSSECCheck from './pages/DNSSECCheck'
import Deliverability from './pages/Deliverability'
import RelayTest from './pages/RelayTest'
import CatchAll from './pages/CatchAll'
import Propagation from './pages/Propagation'
import Subdomains from './pages/Subdomains'
import Geo from './pages/Geo'
import EmailValidator from './pages/EmailValidator'
import TLSInspector from './pages/TLSInspector'
import HTTPHeaders from './pages/HTTPHeaders'
import Sanitize from './pages/Sanitize'
import TLDParser from './pages/TLDParser'
import Batch from './pages/Batch'
import Monitor from './pages/Monitor'
import APIDocs from './pages/APIDocs'
import Settings from './pages/Settings'

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <DomainProvider>
          <HistoryProvider>
            <ScanResultsProvider>
              <MonitorProvider>
                <ToastProvider>
                  <BrowserRouter>
                    <Routes>
                      <Route element={<Layout />}>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/quick-scan" element={<QuickScan />} />
                        <Route path="/dns" element={<DNSLookup />} />
                        <Route path="/mx" element={<MXLookup />} />
                        <Route path="/blacklist" element={<BlacklistCheck />} />
                        <Route path="/spf" element={<SPFCheck />} />
                        <Route path="/dkim" element={<DKIMCheck />} />
                        <Route path="/dmarc" element={<DMARCCheck />} />
                        <Route path="/smtp" element={<SMTPTest />} />
                        <Route path="/ports" element={<PortScan />} />
                        <Route path="/rdns" element={<ReverseDNS />} />
                        <Route path="/headers" element={<HeaderAnalyzer />} />
                        <Route path="/whois" element={<WhoisLookup />} />
                        <Route path="/mtasts" element={<MTASTSCheck />} />
                        <Route path="/tlsrpt" element={<TLSRPTCheck />} />
                        <Route path="/bimi" element={<BIMICheck />} />
                        <Route path="/dnssec" element={<DNSSECCheck />} />
                        <Route path="/deliverability" element={<Deliverability />} />
                        <Route path="/relay" element={<RelayTest />} />
                        <Route path="/catchall" element={<CatchAll />} />
                        <Route path="/propagation" element={<Propagation />} />
                        <Route path="/subdomains" element={<Subdomains />} />
                        <Route path="/geo" element={<Geo />} />
                        <Route path="/email" element={<EmailValidator />} />
                        <Route path="/tls" element={<TLSInspector />} />
                        <Route path="/http" element={<HTTPHeaders />} />
                        <Route path="/sanitize" element={<Sanitize />} />
                        <Route path="/tld" element={<TLDParser />} />
                        <Route path="/batch" element={<Batch />} />
                        <Route path="/monitor" element={<Monitor />} />
                        <Route path="/docs" element={<APIDocs />} />
                        <Route path="/settings" element={<Settings />} />
                      </Route>
                    </Routes>
                  </BrowserRouter>
                </ToastProvider>
              </MonitorProvider>
            </ScanResultsProvider>
          </HistoryProvider>
        </DomainProvider>
      </SettingsProvider>
    </ThemeProvider>
  )
}
