using System;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Net;
using System.Threading;
using System.Windows.Forms;
using System.Runtime.InteropServices;
using Microsoft.Win32;

namespace VictusClientInstaller
{
    static class Program
    {
        [DllImport("user32.dll")]
        private static extern bool SetProcessDPIAware();

        [STAThread]
        static void Main()
        {
            try { SetProcessDPIAware(); } catch {}
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new ModernInstallerForm());
        }
    }

    public class ModernProgressBar : Control
    {
        private int _value = 0;
        public int Value
        {
            get { return _value; }
            set
            {
                int clamped = Math.Min(100, Math.Max(0, value));
                if (_value != clamped)
                {
                    _value = clamped;
                    Invalidate();
                }
            }
        }

        public ModernProgressBar()
        {
            SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw, true);
            Height = 14;
        }

        public static GraphicsPath GetRoundedPath(Rectangle rect, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            int diameter = radius * 2;
            Rectangle arc = new Rectangle(rect.X, rect.Y, diameter, diameter);

            path.AddArc(arc, 180, 90);
            arc.X = rect.Right - diameter;
            path.AddArc(arc, 270, 90);
            arc.Y = rect.Bottom - diameter;
            path.AddArc(arc, 0, 90);
            arc.X = rect.Left;
            path.AddArc(arc, 90, 90);
            path.CloseFigure();
            return path;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            Rectangle trackRect = new Rectangle(0, 0, Width - 1, Height - 1);
            using (GraphicsPath trackPath = GetRoundedPath(trackRect, Height / 2))
            using (SolidBrush bgBrush = new SolidBrush(Color.FromArgb(20, 22, 38)))
            using (Pen borderPen = new Pen(Color.FromArgb(40, 44, 70), 1))
            {
                g.FillPath(bgBrush, trackPath);
                g.DrawPath(borderPen, trackPath);
            }

            if (_value > 0)
            {
                int fillWidth = (int)((Width - 2) * (_value / 100.0));
                if (fillWidth >= Height - 2)
                {
                    Rectangle fillRect = new Rectangle(1, 1, fillWidth, Height - 2);
                    using (GraphicsPath fillPath = GetRoundedPath(fillRect, (Height - 2) / 2))
                    using (LinearGradientBrush fillBrush = new LinearGradientBrush(fillRect, Color.FromArgb(6, 182, 212), Color.FromArgb(168, 85, 247), 0f))
                    {
                        g.FillPath(fillBrush, fillPath);
                    }
                }
            }
        }
    }

    public class ModernButton : Button
    {
        private bool _isHovered = false;
        private bool _isPressed = false;

        public ModernButton()
        {
            SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true);
            Cursor = Cursors.Hand;
            Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            ForeColor = Color.White;
            Size = new Size(160, 42);
        }

        protected override void OnMouseEnter(EventArgs e) { _isHovered = true; Invalidate(); }
        protected override void OnMouseLeave(EventArgs e) { _isHovered = false; _isPressed = false; Invalidate(); }
        protected override void OnMouseDown(MouseEventArgs mevent) { _isPressed = true; Invalidate(); }
        protected override void OnMouseUp(MouseEventArgs mevent) { _isPressed = false; Invalidate(); }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            Rectangle rect = new Rectangle(0, 0, Width - 1, Height - 1);
            using (GraphicsPath path = ModernProgressBar.GetRoundedPath(rect, 10))
            {
                if (!Enabled)
                {
                    using (SolidBrush disabledBrush = new SolidBrush(Color.FromArgb(30, 32, 48)))
                    using (Pen disabledPen = new Pen(Color.FromArgb(50, 52, 70)))
                    {
                        g.FillPath(disabledBrush, path);
                        g.DrawPath(disabledPen, path);
                    }
                    TextRenderer.DrawText(g, Text, Font, rect, Color.FromArgb(110, 115, 140), TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
                    return;
                }

                Color c1 = _isPressed ? Color.FromArgb(2, 132, 199) : (_isHovered ? Color.FromArgb(34, 211, 238) : Color.FromArgb(6, 182, 212));
                Color c2 = _isPressed ? Color.FromArgb(126, 34, 206) : (_isHovered ? Color.FromArgb(192, 132, 252) : Color.FromArgb(168, 85, 247));

                using (LinearGradientBrush brush = new LinearGradientBrush(rect, c1, c2, 0f))
                {
                    g.FillPath(brush, path);
                }

                TextRenderer.DrawText(g, Text, Font, rect, Color.FromArgb(10, 10, 15), TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
            }
        }
    }

    public class ModernInstallerForm : Form
    {
        [DllImport("user32.dll")]
        public static extern bool ReleaseCapture();
        [DllImport("user32.dll")]
        public static extern int SendMessage(IntPtr hWnd, int Msg, int wParam, int lParam);

        private const int WM_NCLBUTTONDOWN = 0xA1;
        private const int HT_CAPTION = 0x2;

        private Label lblStatus;
        private Label lblPercent;
        private ModernProgressBar progressBar;
        private CheckBox chkLaunch;
        private ModernButton btnAction;
        private Button btnClose;
        private Button btnMin;
        private string installDir;

        public ModernInstallerForm()
        {
            this.Text = "VictusClient Setup";
            this.Size = new Size(620, 420);
            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(11, 12, 20);
            this.ForeColor = Color.White;
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            this.DoubleBuffered = true;

            installDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "VictusClient");

            this.MouseDown += OnFormMouseDown;

            InitializeLayout();
            StartInstallation();
        }

        private void OnFormMouseDown(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left)
            {
                ReleaseCapture();
                SendMessage(this.Handle, WM_NCLBUTTONDOWN, HT_CAPTION, 0);
            }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            // Gradient Top Accent Line (3px)
            using (LinearGradientBrush topGlow = new LinearGradientBrush(new Rectangle(0, 0, Width, 3), Color.FromArgb(6, 182, 212), Color.FromArgb(168, 85, 247), 0f))
            {
                g.FillRectangle(topGlow, 0, 0, Width, 3);
            }

            // Outer 1px Subtle Border
            using (Pen borderPen = new Pen(Color.FromArgb(40, 44, 68), 1))
            {
                g.DrawRectangle(borderPen, 0, 0, Width - 1, Height - 1);
            }
        }

        private void InitializeLayout()
        {
            // Title Bar Controls
            Label lblAppIcon = new Label();
            lblAppIcon.Text = "⚡";
            lblAppIcon.Font = new Font("Segoe UI Emoji", 11F, FontStyle.Bold);
            lblAppIcon.ForeColor = Color.FromArgb(6, 182, 212);
            lblAppIcon.Location = new Point(22, 14);
            lblAppIcon.AutoSize = true;
            lblAppIcon.MouseDown += OnFormMouseDown;
            this.Controls.Add(lblAppIcon);

            Label lblAppTitle = new Label();
            lblAppTitle.Text = "VictusClient Setup";
            lblAppTitle.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            lblAppTitle.ForeColor = Color.FromArgb(200, 205, 225);
            lblAppTitle.Location = new Point(44, 16);
            lblAppTitle.AutoSize = true;
            lblAppTitle.MouseDown += OnFormMouseDown;
            this.Controls.Add(lblAppTitle);

            // Minimize Button
            btnMin = new Button();
            btnMin.Text = "─";
            btnMin.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnMin.ForeColor = Color.FromArgb(140, 145, 170);
            btnMin.BackColor = Color.Transparent;
            btnMin.FlatStyle = FlatStyle.Flat;
            btnMin.FlatAppearance.BorderSize = 0;
            btnMin.FlatAppearance.MouseOverBackColor = Color.FromArgb(30, 32, 50);
            btnMin.Size = new Size(32, 26);
            btnMin.Location = new Point(Width - 76, 6);
            btnMin.Cursor = Cursors.Hand;
            btnMin.Click += (s, e) => this.WindowState = FormWindowState.Minimized;
            this.Controls.Add(btnMin);

            // Close Button
            btnClose = new Button();
            btnClose.Text = "✕";
            btnClose.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnClose.ForeColor = Color.FromArgb(140, 145, 170);
            btnClose.BackColor = Color.Transparent;
            btnClose.FlatStyle = FlatStyle.Flat;
            btnClose.FlatAppearance.BorderSize = 0;
            btnClose.FlatAppearance.MouseOverBackColor = Color.FromArgb(225, 29, 72);
            btnClose.Size = new Size(32, 26);
            btnClose.Location = new Point(Width - 42, 6);
            btnClose.Cursor = Cursors.Hand;
            btnClose.Click += (s, e) => Application.Exit();
            this.Controls.Add(btnClose);

            // Hero Branding
            Label lblHero = new Label();
            lblHero.Text = "VICTUS CLIENT";
            lblHero.Font = new Font("Segoe UI", 22F, FontStyle.Bold);
            lblHero.ForeColor = Color.White;
            lblHero.Location = new Point(36, 52);
            lblHero.AutoSize = true;
            this.Controls.Add(lblHero);

            Label lblBadge = new Label();
            lblBadge.Text = "v1.0.2 • Fast Setup";
            lblBadge.Font = new Font("Segoe UI", 8.5F, FontStyle.Bold);
            lblBadge.ForeColor = Color.FromArgb(34, 211, 238);
            lblBadge.BackColor = Color.FromArgb(20, 45, 65);
            lblBadge.Padding = new Padding(6, 2, 6, 2);
            lblBadge.Location = new Point(285, 60);
            lblBadge.AutoSize = true;
            this.Controls.Add(lblBadge);

            Label lblSubtitle = new Label();
            lblSubtitle.Text = "Next-Generation Minecraft Launcher, High-FPS Engine & Cloud Multiplayer";
            lblSubtitle.Font = new Font("Segoe UI", 9.5F, FontStyle.Regular);
            lblSubtitle.ForeColor = Color.FromArgb(167, 139, 250);
            lblSubtitle.Location = new Point(38, 96);
            lblSubtitle.AutoSize = true;
            this.Controls.Add(lblSubtitle);

            // Feature Highlights Deck (3 Cards)
            int cardW = 168;
            int cardH = 82;
            int cardY = 135;

            Panel card1 = CreateFeatureCard("⚡ Ultra FPS Engine", "Zero-lag Fabric/Forge launch with smart memory allocation", 36, cardY, cardW, cardH);
            Panel card2 = CreateFeatureCard("☁️ Free Cloud Servers", "Instant 24/7 world multiplayer with 1-click cloud wake", 36 + cardW + 16, cardY, cardW, cardH);
            Panel card3 = CreateFeatureCard("🎨 Shaders & Mods", "Integrated Modrinth content browser & visual customization", 36 + (cardW + 16) * 2, cardY, cardW, cardH);

            this.Controls.Add(card1);
            this.Controls.Add(card2);
            this.Controls.Add(card3);

            // Progress Section
            lblStatus = new Label();
            lblStatus.Text = "Preparing installation...";
            lblStatus.Font = new Font("Segoe UI", 9.5F, FontStyle.Regular);
            lblStatus.ForeColor = Color.FromArgb(203, 213, 225);
            lblStatus.Location = new Point(36, 245);
            lblStatus.Size = new Size(440, 20);
            this.Controls.Add(lblStatus);

            lblPercent = new Label();
            lblPercent.Text = "0%";
            lblPercent.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            lblPercent.ForeColor = Color.FromArgb(34, 211, 238);
            lblPercent.Location = new Point(510, 245);
            lblPercent.Size = new Size(74, 20);
            lblPercent.TextAlign = ContentAlignment.TopRight;
            this.Controls.Add(lblPercent);

            progressBar = new ModernProgressBar();
            progressBar.Location = new Point(36, 272);
            progressBar.Size = new Size(548, 14);
            progressBar.Value = 0;
            this.Controls.Add(progressBar);

            // Bottom Actions Section
            chkLaunch = new CheckBox();
            chkLaunch.Text = "Launch VictusClient after installation completes";
            chkLaunch.Font = new Font("Segoe UI", 9.5F, FontStyle.Regular);
            chkLaunch.ForeColor = Color.FromArgb(203, 213, 225);
            chkLaunch.Checked = true;
            chkLaunch.Location = new Point(38, 335);
            chkLaunch.AutoSize = true;
            this.Controls.Add(chkLaunch);

            btnAction = new ModernButton();
            btnAction.Text = "Installing...";
            btnAction.Location = new Point(424, 330);
            btnAction.Size = new Size(160, 42);
            btnAction.Enabled = false;
            btnAction.Click += BtnAction_Click;
            this.Controls.Add(btnAction);
        }

        private Panel CreateFeatureCard(string title, string desc, int x, int y, int w, int h)
        {
            Panel p = new Panel();
            p.Location = new Point(x, y);
            p.Size = new Size(w, h);
            p.BackColor = Color.FromArgb(17, 19, 32);

            p.Paint += (s, pe) =>
            {
                using (Pen pen = new Pen(Color.FromArgb(35, 38, 62), 1))
                {
                    pe.Graphics.DrawRectangle(pen, 0, 0, w - 1, h - 1);
                }
            };

            Label lblT = new Label();
            lblT.Text = title;
            lblT.Font = new Font("Segoe UI", 8.5F, FontStyle.Bold);
            lblT.ForeColor = Color.White;
            lblT.Location = new Point(8, 8);
            lblT.AutoSize = true;
            p.Controls.Add(lblT);

            Label lblD = new Label();
            lblD.Text = desc;
            lblD.Font = new Font("Segoe UI", 8F, FontStyle.Regular);
            lblD.ForeColor = Color.FromArgb(148, 163, 184);
            lblD.Location = new Point(8, 28);
            lblD.Size = new Size(w - 16, 48);
            p.Controls.Add(lblD);

            return p;
        }

        private void StartInstallation()
        {
            Thread t = new Thread(InstallWorker);
            t.IsBackground = true;
            t.Start();
        }

        private void InstallWorker()
        {
            try
            {
                UpdateProgress(5, "Verifying environment...");
                Thread.Sleep(300);

                if (!Directory.Exists(installDir))
                {
                    Directory.CreateDirectory(installDir);
                }

                Assembly asm = Assembly.GetExecutingAssembly();
                string exePath = Path.Combine(installDir, "VictusClient.exe");
                string asarPath = Path.Combine(installDir, "resources", "app.asar");

                // Check for embedded AppPackage (full distribution) or AppAsar (compact package)
                bool hasEmbeddedPackage = false;

                using (Stream stream = asm.GetManifestResourceStream("AppPackage"))
                {
                    if (stream != null)
                    {
                        hasEmbeddedPackage = true;
                        UpdateProgress(20, "Extracting full client application...");
                        ExtractZipStream(stream, installDir, 20, 75);
                    }
                }

                if (!hasEmbeddedPackage)
                {
                    using (Stream asarStream = asm.GetManifestResourceStream("AppAsar"))
                    {
                        if (asarStream != null)
                        {
                            hasEmbeddedPackage = true;
                            UpdateProgress(25, "Deploying core client package...");
                            string resDir = Path.Combine(installDir, "resources");
                            if (!Directory.Exists(resDir)) Directory.CreateDirectory(resDir);
                            ExtractZipStream(asarStream, resDir, 25, 75);
                        }
                    }
                }

                // If runtime is missing on fresh machine, download latest release payload
                if (!File.Exists(exePath))
                {
                    UpdateProgress(25, "Fetching latest VictusClient release from GitHub...");
                    string downloadUrl = "https://github.com/ArhanRaaj/VictusClient/releases/latest/download/VictusClient-Setup-1.0.2.exe";
                    string tempExe = Path.Combine(Path.GetTempPath(), "VictusClient-Setup-Online.exe");

                    DownloadFileWithProgress(downloadUrl, tempExe, 25, 80);

                    UpdateProgress(82, "Configuring client binaries...");
                    Process p = Process.Start(new ProcessStartInfo(tempExe, "/S") { UseShellExecute = true });
                    if (p != null) p.WaitForExit(60000);
                    try { File.Delete(tempExe); } catch {}
                }

                UpdateProgress(88, "Creating Desktop & Start Menu shortcuts...");
                CreateShortcuts();

                UpdateProgress(96, "Registering Windows system entry...");
                RegisterUninstall();

                UpdateProgress(100, "Installation complete! Ready to launch.");
                this.Invoke((MethodInvoker)delegate
                {
                    lblStatus.Text = "VictusClient is installed and ready to play.";
                    lblStatus.ForeColor = Color.FromArgb(52, 211, 153);
                    btnAction.Text = "Finish & Launch ➔";
                    btnAction.Enabled = true;
                });
            }
            catch (Exception ex)
            {
                this.Invoke((MethodInvoker)delegate
                {
                    lblStatus.Text = "Notice: " + ex.Message;
                    lblStatus.ForeColor = Color.FromArgb(244, 63, 94);
                    btnAction.Text = "Close";
                    btnAction.Enabled = true;
                });
            }
        }

        private void ExtractZipStream(Stream stream, string targetDir, int startPct, int endPct)
        {
            using (ZipArchive archive = new ZipArchive(stream, ZipArchiveMode.Read))
            {
                int total = archive.Entries.Count;
                int current = 0;
                foreach (ZipArchiveEntry entry in archive.Entries)
                {
                    string dest = Path.Combine(targetDir, entry.FullName);
                    if (string.IsNullOrEmpty(entry.Name))
                    {
                        Directory.CreateDirectory(dest);
                    }
                    else
                    {
                        string dir = Path.GetDirectoryName(dest);
                        if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                        entry.ExtractToFile(dest, true);
                    }
                    current++;
                    if (current % 5 == 0 || current == total)
                    {
                        int pct = startPct + (int)(((double)current / total) * (endPct - startPct));
                        UpdateProgress(pct, string.Format("Extracting: {0}", entry.Name));
                    }
                }
            }
        }

        private void DownloadFileWithProgress(string url, string destFile, int startPct, int endPct)
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
            using (WebClient client = new WebClient())
            {
                client.Headers.Add("User-Agent", "VictusClient-Installer");
                client.DownloadProgressChanged += (s, e) =>
                {
                    int pct = startPct + (int)(((double)e.ProgressPercentage / 100.0) * (endPct - startPct));
                    string mb = string.Format("{0:0.0} MB / {1:0.0} MB", e.BytesReceived / 1024.0 / 1024.0, e.TotalBytesToReceive / 1024.0 / 1024.0);
                    UpdateProgress(pct, string.Format("Downloading components: {0} ({1}%)", mb, e.ProgressPercentage));
                };

                AutoResetEvent done = new AutoResetEvent(false);
                client.DownloadFileCompleted += (s, e) => done.Set();
                client.DownloadFileAsync(new Uri(url), destFile);
                done.WaitOne();
            }
        }

        private void UpdateProgress(int value, string text)
        {
            if (this.IsDisposed || !this.IsHandleCreated) return;
            this.BeginInvoke((MethodInvoker)delegate
            {
                progressBar.Value = value;
                lblPercent.Text = value + "%";
                lblStatus.Text = text;
            });
        }

        private void CreateShortcuts()
        {
            try
            {
                string exePath = Path.Combine(installDir, "VictusClient.exe");
                if (!File.Exists(exePath)) return;

                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    dynamic shell = Activator.CreateInstance(shellType);

                    // Desktop Shortcut
                    string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                    dynamic shortcut = shell.CreateShortcut(Path.Combine(desktop, "VictusClient.lnk"));
                    shortcut.TargetPath = exePath;
                    shortcut.WorkingDirectory = installDir;
                    shortcut.Description = "VictusClient - Next-Gen Minecraft Launcher";
                    shortcut.Save();

                    // Start Menu Shortcut
                    string startMenu = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
                    dynamic startShortcut = shell.CreateShortcut(Path.Combine(startMenu, "VictusClient.lnk"));
                    startShortcut.TargetPath = exePath;
                    startShortcut.WorkingDirectory = installDir;
                    startShortcut.Description = "VictusClient - Next-Gen Minecraft Launcher";
                    startShortcut.Save();
                }
            }
            catch {}
        }

        private void RegisterUninstall()
        {
            try
            {
                string keyPath = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\VictusClient";
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(keyPath))
                {
                    if (key != null)
                    {
                        string exePath = Path.Combine(installDir, "VictusClient.exe");
                        key.SetValue("DisplayName", "VictusClient");
                        key.SetValue("DisplayVersion", "1.0.2");
                        key.SetValue("Publisher", "VictusClient Team");
                        key.SetValue("InstallLocation", installDir);
                        key.SetValue("DisplayIcon", exePath);
                        key.SetValue("UninstallString", "cmd.exe /c rd /s /q \"" + installDir + "\"");
                    }
                }
            }
            catch {}
        }

        private void BtnAction_Click(object sender, EventArgs e)
        {
            if (chkLaunch.Checked)
            {
                string exePath = Path.Combine(installDir, "VictusClient.exe");
                if (File.Exists(exePath))
                {
                    Process.Start(new ProcessStartInfo(exePath) { WorkingDirectory = installDir });
                }
            }
            Application.Exit();
        }
    }
}
